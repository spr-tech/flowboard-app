"use client";

import { useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { taskTitleField, TASK_TITLE_MAX } from "@/models/validations/boardValidation";
import { useCreateTaskMutation } from "@/services/tasksService";
import { applyApiError } from "@/utilities/helpers/applyApiError";

const quickAddSchema = z.object({ title: taskTitleField });
type QuickAddValues = z.infer<typeof quickAddSchema>;

type QuickAddFormProps = { projectId: string; columnId: string; columnName: string };

/**
 * "+ Add task" at the bottom of a column. Enter adds and keeps the field open for the next one;
 * Esc closes. A failed add keeps the text so it can be tried again.
 */
export function QuickAddForm({ projectId, columnId, columnName }: QuickAddFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [createTask] = useCreateTaskMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<QuickAddValues>({ resolver: zodResolver(quickAddSchema), defaultValues: { title: "" } });

  if (!isOpen) {
    return (
      <Button
        text="Add task"
        variant="ghost"
        size="sm"
        startIcon={<Plus aria-hidden />}
        className="w-full justify-start"
        onClick={() => setIsOpen(true)}
        aria-label={`Add a task to ${columnName}`}
      />
    );
  }

  const close = () => {
    reset();
    setIsOpen(false);
  };

  const onSubmit = async ({ title }: QuickAddValues) => {
    try {
      await createTask({ projectId, columnId, title }).unwrap();
      reset();
      setFocus("title");
    } catch (error) {
      applyApiError(error, ["title"], setError);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <FormFieldset disabled={isSubmitting} className="contents">
        <input
          {...register("title")}
          autoFocus
          maxLength={TASK_TITLE_MAX}
          onKeyDown={onKeyDown}
          aria-label={`New task in ${columnName}`}
          aria-invalid={errors.title ? true : undefined}
          placeholder="What needs doing?"
          className="h-11 rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary"
        />
        {errors.title && (
          <p role="alert" className="text-xs text-danger">
            {errors.title.message}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-fg-muted">Enter to add · Esc to close</span>
          <Button text="Add" loadingText="Adding…" type="submit" size="sm" isLoading={isSubmitting} />
        </div>
      </FormFieldset>
    </form>
  );
}
