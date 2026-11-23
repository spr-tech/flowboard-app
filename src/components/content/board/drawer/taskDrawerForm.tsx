"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { Lock, Trash2 } from "lucide-react";

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

/** A one-line reason under a field I can't change. */
function LockedReason({ id, reason }: { id: string; reason: string }) {
  return (
    <p id={id} className="flex items-center gap-1.5 text-xs text-fg-secondary">
      <Lock aria-hidden className="size-3.5 shrink-0" />
      {reason}
    </p>
  );
}

/**
 * Every field of a task, saving as you edit. Each field asks can(): what I may not change is
 * read-only with a one-line reason. Remounted per task (key), so it starts fresh.
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

  const can = (action: PermissionAction) => projectCan(project, meId, action, { task });
  const rights = {
    title: can("task.editTitle"),
    description: can("task.editDescription"),
    priority: can("task.editPriority"),
    dueDate: can("task.editDueDate"),
    move: can("task.move"),
    delete: can("task.delete"),
  };
  const teamCards = can("task.reorderTeam").allowed;
  // One reason for the main fields (they're locked together), shown once under the title.
  const fieldsReason = !rights.title.allowed ? rights.title.reason : null;

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
      <div className="flex flex-col gap-2">
        <label htmlFor={ids.title} className={label}>
          Title
        </label>
        <input
          id={ids.title}
          value={text.title}
          maxLength={TASK_TITLE_MAX}
          readOnly={!rights.title.allowed}
          onChange={(event) => onText("title", event.target.value)}
          onBlur={autosave.blurred}
          aria-invalid={errors.title ? true : undefined}
          aria-describedby={fieldsReason ? `${id}r` : undefined}
          className={`${field} h-12 font-heading text-lg font-bold`}
        />
        {errors.title && (
          <p role="alert" className="text-sm text-danger">
            {errors.title}
          </p>
        )}
        {fieldsReason && <LockedReason id={`${id}r`} reason={fieldsReason} />}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.column} className={label}>
            Column
          </label>
          <select
            id={ids.column}
            value={task.columnId}
            disabled={!rights.move.allowed}
            aria-describedby={!rights.move.allowed ? `${id}m` : undefined}
            onChange={(e) => void moveTo(e.target.value)}
            className={`${field} h-11`}
          >
            {project.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
          {!rights.move.allowed && <LockedReason id={`${id}m`} reason={rights.move.reason} />}
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.assignee} className={label}>
            Assignee
          </label>
          <AssigneeField
            id={ids.assignee}
            projectId={project.id}
            task={task}
            members={project.members}
            meId={meId}
            mayAssign={can("task.assignOthers").allowed}
            take={can("task.take")}
            onAssign={(assigneeId) => void save({ assigneeId })}
            fieldClass={field}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.priority} className={label}>
            Priority
          </label>
          <select
            id={ids.priority}
            value={task.priority}
            disabled={!rights.priority.allowed}
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
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.due} className={label}>
            Due date
          </label>
          <input
            id={ids.due}
            type="date"
            value={task.dueDate ?? ""}
            readOnly={!rights.dueDate.allowed}
            aria-describedby={!rights.dueDate.allowed && !fieldsReason ? `${id}u` : undefined}
            onChange={(e) => rights.dueDate.allowed && void save({ dueDate: e.target.value || null })}
            className={`${field} h-11`}
          />
          {/* Shown on its own only when the other fields are editable (a member's own task). */}
          {!rights.dueDate.allowed && !fieldsReason && <LockedReason id={`${id}u`} reason={rights.dueDate.reason} />}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor={ids.desc} className={label}>
          Description
        </label>
        <textarea
          id={ids.desc}
          value={text.description}
          maxLength={TASK_DESCRIPTION_MAX}
          rows={6}
          readOnly={!rights.description.allowed}
          onChange={(event) => onText("description", event.target.value)}
          onBlur={autosave.blurred}
          aria-invalid={errors.description ? true : undefined}
          placeholder={rights.description.allowed ? "Add details, links or steps" : "No description"}
          className={`${field} py-2.5 leading-relaxed`}
        />
        {errors.description && (
          <p role="alert" className="text-sm text-danger">
            {errors.description}
          </p>
        )}
      </div>

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
