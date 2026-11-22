"use client";

import { useEffect, useId, useState, type RefObject } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { BoardTask, TaskPriority } from "@/models/responses/boardResponses";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { TASK_DESCRIPTION_MAX, TASK_TITLE_MAX } from "@/models/validations/boardValidation";
import { useMoveTaskMutation, useUpdateTaskMutation, type UpdateTaskArgs } from "@/services/tasksService";
import { useDeleteTask } from "@/utilities/hooks/useDeleteTask";
import { TaskHistory } from "./taskHistory";
import { useTaskAutosave, type TextField } from "./useTaskAutosave";

type TaskDrawerFormProps = {
  project: Pick<ProjectDetail, "id" | "columns" | "members">;
  task: BoardTask;
  meId: string | null;
  /** The drawer calls this before closing, so pending text edits save first. */
  flushRef: RefObject<(() => void) | null>;
  onDeleted: () => void;
};

const label = "text-sm font-semibold";
const field =
  "w-full rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary aria-invalid:border-danger";
const priorities: { value: TaskPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

/** Every field of a task, saving as you edit. Remounted per task (key), so it starts fresh. */
export function TaskDrawerForm({ project, task, meId, flushRef, onDeleted }: TaskDrawerFormProps) {
  const ids = { title: useId(), column: useId(), assignee: useId(), priority: useId(), due: useId(), desc: useId() };
  const [text, setText] = useState({ title: task.title, description: task.description ?? "" });
  const [errors, setErrors] = useState<Partial<Record<TextField, string>>>({});
  const [updateTask] = useUpdateTaskMutation();
  const [moveTask] = useMoveTaskMutation();
  const deleteTask = useDeleteTask(project.id);

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
      await moveTask({ projectId: project.id, taskId: task.id, columnId }).unwrap();
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.column} className={label}>
            Column
          </label>
          <select
            id={ids.column}
            value={task.columnId}
            onChange={(e) => void moveTo(e.target.value)}
            className={`${field} h-11`}
          >
            {project.columns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={ids.assignee} className={label}>
            Assignee
          </label>
          <select
            id={ids.assignee}
            value={task.assignee?.id ?? ""}
            onChange={(e) => void save({ assigneeId: e.target.value || null })}
            className={`${field} h-11`}
          >
            <option value="">Unassigned</option>
            {project.members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name ?? "Unnamed"}
                {member.id === meId ? " (you)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
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

      <TaskHistory taskId={task.id} meId={meId} />

      <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
        <Button
          text="Delete task"
          variant="ghost"
          className="text-danger"
          startIcon={<Trash2 aria-hidden />}
          onClick={remove}
        />
        <span className="text-sm text-fg-muted">Changes save automatically</span>
      </div>
    </div>
  );
}
