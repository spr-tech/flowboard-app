"use client";

import { useId, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import {
  memberTaskFormSchema,
  TASK_DESCRIPTION_MAX,
  TASK_TITLE_MAX,
  type MemberTaskFormValues,
} from "@/models/validations/boardValidation";
import { useCreateTaskMutation } from "@/services/tasksService";
import { applyApiError } from "@/utilities/helpers/applyApiError";

export const MEMBER_DESCRIPTION_PLACEHOLDER =
  "What needs doing, and why? E.g. The checkout button does nothing on Safari, customers can't pay.";

type MemberTaskFormProps = { projectId: string; columnId: string; columnName: string; onClose: () => void };

const inputClass =
  "rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary";

/**
 * Quick add for members (and managers who can't assign others): the task will be theirs, so it
 * needs a description of at least 20 characters, and the due date can be set now only. Esc closes.
 */
export function MemberTaskForm({ projectId, columnId, columnName, onClose }: MemberTaskFormProps) {
  const ids = { description: useId(), due: useId(), dueHint: useId() };
  const [createTask] = useCreateTaskMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<MemberTaskFormValues>({
    resolver: zodResolver(memberTaskFormSchema),
    defaultValues: { title: "", description: "", dueDate: "" },
  });

  const onSubmit = async ({ title, description, dueDate }: MemberTaskFormValues) => {
    try {
      await createTask({ projectId, columnId, title, description, ...(dueDate ? { dueDate } : {}) }).unwrap();
      reset();
      setFocus("title");
    } catch (error) {
      applyApiError(error, ["title", "description", "dueDate"], setError);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      reset();
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} onKeyDown={onKeyDown} noValidate className="flex flex-col gap-2">
      <input
        {...register("title")}
        autoFocus
        maxLength={TASK_TITLE_MAX}
        aria-label={`New task in ${columnName}`}
        aria-invalid={errors.title ? true : undefined}
        placeholder="Task title"
        className={`h-11 ${inputClass}`}
      />
      {errors.title && (
        <p role="alert" className="text-xs text-danger">
          {errors.title.message}
        </p>
      )}
      <label htmlFor={ids.description} className="sr-only">
        Description
      </label>
      <textarea
        id={ids.description}
        {...register("description")}
        rows={3}
        maxLength={TASK_DESCRIPTION_MAX}
        aria-invalid={errors.description ? true : undefined}
        placeholder={MEMBER_DESCRIPTION_PLACEHOLDER}
        className={`py-2 ${inputClass}`}
      />
      {errors.description && (
        <p role="alert" className="text-xs text-danger">
          {errors.description.message}
        </p>
      )}
      <label htmlFor={ids.due} className="text-xs font-semibold text-fg-secondary">
        Due date (optional)
      </label>
      <input
        id={ids.due}
        type="date"
        {...register("dueDate")}
        aria-describedby={ids.dueHint}
        aria-invalid={errors.dueDate ? true : undefined}
        className={`h-10 ${inputClass}`}
      />
      <p id={ids.dueHint} className="text-xs text-fg-muted">
        You can&apos;t change this later
      </p>
      {errors.dueDate && (
        <p role="alert" className="text-xs text-danger">
          {errors.dueDate.message}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-fg-muted">Assigned to you · Esc to close</span>
        <Button text="Add task" type="submit" size="sm" isLoading={isSubmitting} />
      </div>
    </form>
  );
}
