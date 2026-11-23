"use client";

import { useEffect, useId, useState, type ReactNode, type RefObject } from "react";
import { Info, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { BoardTask, TaskPriority } from "@/models/responses/boardResponses";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from "@/models/validations/boardValidation";
import {
  useMarkTaskSeenMutation,
  useMoveTaskMutation,
  useUpdateTaskMutation,
  type UpdateTaskArgs,
} from "@/services/tasksService";
import { cn } from "@/utilities/helpers/cn";
import type { PermissionAction } from "@/utilities/helpers/permissions";
import { projectCan } from "@/utilities/helpers/projectPermissions";
import { useDeleteTask } from "@/utilities/hooks/useDeleteTask";
import { AssigneeField } from "./assigneeField";
import { TaskHistory } from "./taskHistory";
import { TaskNotes } from "./taskNotes";
import { useTaskAutosave, type TextField } from "./useTaskAutosave";

type TaskDrawerFormProps = {
  project: Pick<ProjectDetail, "id" | "columns" | "members" | "me" | "memberTakeLimit">;
  task: BoardTask;
  meId: string | null;
  /** The drawer calls this before closing, so pending text edits save first. */
  flushRef: RefObject<(() => void) | null>;
  onDeleted: () => void;
};

const label = "text-sm font-semibold";
const field =
  "w-full rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary aria-invalid:border-danger read-only:bg-surface-sunken disabled:bg-surface-sunken disabled:opacity-100";
const priorities: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const PRIORITY_LABELS: Record<TaskPriority, string> = { LOW: "Low", MEDIUM: "Medium", HIGH: "High" };

/** A field I can't change: its label and its value as plain text, not a disabled control. */
function ReadOnlyField({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={label}>{name}</span>
      <div className="text-[15px] wrap-break-word text-fg-primary">{children}</div>
    </div>
  );
}

const formatDay = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

const joinWords = (words: string[]) =>
  words.length < 2 ? (words[0] ?? "") : `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;

/**
 * The one note at the top of the drawer when I can't change everything: what I can do, and who
 * can change the rest. Null when every field is mine to change.
 */
function lockNote(rights: { details: boolean; move: boolean; dueDate: boolean }): string | null {
  const { details, move, dueDate } = rights;
  if (details && move && dueDate) return null;
  if (!details && !move && !dueDate) {
    return "You can view this task and add notes. Only its creator, the owner or a manager can change it.";
  }
  const mine = [details && "edit the details", move && "move the task", dueDate && "change the due date"];
  const locked = [!details && "the details", !move && "the column", !dueDate && "the due date"];
  const who = details ? "the owner or a manager" : "its creator, the owner or a manager";
  const words = (list: (string | false)[]) => joinWords(list.filter((word): word is string => !!word));
  return `You can ${words([...mine, "add notes"])}. Only ${who} can change ${words(locked)}.`;
}

/**
 * Every field of a task, saving as you edit. Each field asks can(): what I may not change shows
 * as plain text, with one note at the top saying what I can do. Remounted per task (key).
 */
export function TaskDrawerForm({ project, task, meId, flushRef, onDeleted }: TaskDrawerFormProps) {
  const id = useId();
  const ids = {
    title: `${id}t`,
    column: `${id}c`,
    assignee: `${id}a`,
    priority: `${id}p`,
    due: `${id}d`,
    desc: `${id}x`,
  };
  const [text, setText] = useState({ title: task.title, description: task.description ?? "" });
  const [errors, setErrors] = useState<Partial<Record<TextField, string>>>({});
  const [updateTask] = useUpdateTaskMutation();
  const [moveTask] = useMoveTaskMutation();
  const [markSeen] = useMarkTaskSeenMutation();
  const deleteTask = useDeleteTask(project.id);

  const column = project.columns.find((candidate) => candidate.id === task.columnId);
  const inDoneColumn = column?.isDone === true;
  const can = (action: PermissionAction) => projectCan(project, meId, action, { task: { ...task, inDoneColumn } });
  const rights = {
    title: can("task.editTitle"),
    description: can("task.editDescription"),
    priority: can("task.editPriority"),
    dueDate: can("task.editDueDate"),
    move: can("task.move"),
    delete: can("task.delete"),
  };
  const teamCards = can("task.reorderTeam").allowed;
  // Title, description and priority share one rule, so they're "the details" together.
  const note = lockNote({ details: rights.title.allowed, move: rights.move.allowed, dueDate: rights.dueDate.allowed });

  const isOwner = project.me.role === "OWNER";
  useEffect(() => {
    // The owner opened a member's new task: it stops being "New".
    if (isOwner && task.newForOwner) void markSeen({ projectId: project.id, taskId: task.id });
  }, [isOwner, task.newForOwner, task.id, project.id, markSeen]);

  const autosave = useTaskAutosave({
    projectId: project.id,
    taskId: task.id,
    saved: { title: task.title, description: task.description },
    read: () => text,
    onError: (name, message) => setErrors((current) => ({ ...current, [name]: message })),
  });
  useEffect(() => {
    flushRef.current = autosave.flush;
    return () => {
      flushRef.current = null;
    };
  }, [flushRef, autosave.flush]);

  const onText = (name: TextField, value: string) => {
    setText((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    autosave.changed(name);
  };

  /** Selects save straight away. */
  const save = (changes: Omit<UpdateTaskArgs, "projectId" | "taskId">) =>
    updateTask({ projectId: project.id, taskId: task.id, ...changes })
      .unwrap()
      .catch(() => undefined);

  const moveTo = async (columnId: string) => {
    try {
      await moveTask({
        projectId: project.id,
        taskId: task.id,
        columnId,
        personal: !teamCards,
        meId: meId ?? undefined,
      }).unwrap();
      toast({ type: "success", message: `Moved to ${project.columns.find((c) => c.id === columnId)?.name}` });
    } catch {
      // moveTask put it back; the base query showed why.
    }
  };

  const remove = () => {
    autosave.cancel();
    deleteTask({ id: task.id, title: task.title });
    onDeleted();
  };

  return (
    <div className="flex flex-col gap-5">
      {note && (
        <p className="flex gap-2 rounded-input bg-surface-sunken px-3 py-2.5 text-sm text-fg-secondary">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          {note}
        </p>
      )}

      {rights.title.allowed ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.title} className={label}>
            Title
          </label>
          <input
            id={ids.title}
            value={text.title}
            maxLength={TASK_TITLE_MAX}
            onChange={(event) => onText("title", event.target.value)}
            onBlur={autosave.blurred}
            aria-invalid={errors.title ? true : undefined}
            className={`${field} h-12 font-heading text-lg font-bold`}
          />
          {errors.title && (
            <p role="alert" className="text-sm text-danger">
              {errors.title}
            </p>
          )}
        </div>
      ) : (
        <ReadOnlyField name="Title">
          <span className="font-heading text-lg font-bold">{task.title}</span>
        </ReadOnlyField>
      )}

      {/* One column on phones, so long names and dates never truncate. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rights.move.allowed ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={ids.column} className={label}>
              Column
            </label>
            <select
              id={ids.column}
              value={task.columnId}
              onChange={(e) => void moveTo(e.target.value)}
              className={`${field} h-11`}
            >
              {project.columns.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <ReadOnlyField name="Column">{column?.name ?? ""}</ReadOnlyField>
        )}
        <AssigneeField
          id={ids.assignee}
          labelClass={label}
          projectId={project.id}
          task={task}
          members={project.members}
          meId={meId}
          mayAssign={can("task.assignOthers").allowed}
          take={can("task.take")}
          inDoneColumn={inDoneColumn}
          onAssign={(assigneeId) => void save({ assigneeId })}
          fieldClass={field}
        />
        {rights.priority.allowed ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={ids.priority} className={label}>
              Priority
            </label>
            <select
              id={ids.priority}
              value={task.priority}
              onChange={(e) => void save({ priority: e.target.value as TaskPriority })}
              className={`${field} h-11`}
            >
              {priorities.map(({ value, label: text }) => (
                <option key={value} value={value}>
                  {text}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <ReadOnlyField name="Priority">{PRIORITY_LABELS[task.priority]}</ReadOnlyField>
        )}
        {rights.dueDate.allowed ? (
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor={ids.due} className={label}>
              Due date
            </label>
            <input
              id={ids.due}
              type="date"
              value={task.dueDate ?? ""}
              onChange={(e) => void save({ dueDate: e.target.value || null })}
              className={`${field} h-11`}
            />
          </div>
        ) : (
          <ReadOnlyField name="Due date">{task.dueDate ? formatDay(task.dueDate) : "No due date"}</ReadOnlyField>
        )}
      </div>

      {rights.description.allowed ? (
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.desc} className={label}>
            Description
          </label>
          <textarea
            id={ids.desc}
            value={text.description}
            maxLength={TASK_DESCRIPTION_MAX}
            rows={6}
            onChange={(event) => onText("description", event.target.value)}
            onBlur={autosave.blurred}
            aria-invalid={errors.description ? true : undefined}
            placeholder="Add details, links or steps"
            className={`${field} py-2.5 leading-relaxed`}
          />
          {errors.description && (
            <p role="alert" className="text-sm text-danger">
              {errors.description}
            </p>
          )}
        </div>
      ) : (
        <ReadOnlyField name="Description">
          {task.description ? (
            <p className="leading-relaxed whitespace-pre-wrap">{task.description}</p>
          ) : (
            <span className="text-fg-muted">No description</span>
          )}
        </ReadOnlyField>
      )}

      <TaskNotes project={project} taskId={task.id} meId={meId} />

      <TaskHistory taskId={task.id} meId={meId} />

      <div
        className={cn(
          "flex items-center gap-3 border-t border-line-subtle pt-4",
          rights.delete.allowed ? "justify-between" : "justify-end"
        )}
      >
        {rights.delete.allowed && (
          <Button
            text="Delete task"
            variant="ghost"
            className="text-danger"
            startIcon={<Trash2 aria-hidden />}
            onClick={remove}
          />
        )}
        <span className="text-sm text-fg-muted">Changes save automatically</span>
      </div>
    </div>
  );
}
