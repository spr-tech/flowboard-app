"use client";

import { useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import { COLUMN_NAME_MAX, createColumnSchema } from "@/models/validations/boardValidation";
import { useCreateColumnMutation } from "@/services/columnsService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { cn } from "@/utilities/helpers/cn";

type AddColumnValues = { name: string };

type AddColumnFormProps = {
  projectId: string;
  /** The board's 300px column card, or the settings page's full-width row. */
  layout?: "board" | "row";
};

/** Owner only. New columns go just before the done column. Enter adds, Esc closes. */
export function AddColumnForm({ projectId, layout = "board" }: AddColumnFormProps) {
  const [isOpen, setIsOpen] = useState(layout === "row");
  const [createColumn] = useCreateColumnMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddColumnValues>({ resolver: zodResolver(createColumnSchema), defaultValues: { name: "" } });

  if (!isOpen) {
    return (
      <Button
        text="Add column"
        variant="ghost"
        startIcon={<Plus aria-hidden />}
        className="w-[300px] shrink-0 justify-start rounded-card border-2 border-dashed border-line-strong"
        onClick={() => setIsOpen(true)}
      />
    );
  }

  const close = () => {
    reset();
    if (layout === "board") setIsOpen(false);
  };

  const onSubmit = async ({ name }: AddColumnValues) => {
    try {
      await createColumn({ projectId, name }).unwrap();
      toast({ type: "success", message: `${name} column added` });
      reset();
    } catch (error) {
      applyApiError(error, ["name"], setError);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape" && layout === "board") {
      event.preventDefault();
      close();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className={cn(
        "flex flex-col gap-2",
        layout === "board" && "w-[300px] shrink-0 self-start rounded-card bg-surface-sunken p-3"
      )}
    >
      <div className="flex gap-2">
        <input
          {...register("name")}
          autoFocus={layout === "board"}
          maxLength={COLUMN_NAME_MAX}
          onKeyDown={onKeyDown}
          aria-label="New column name"
          aria-invalid={errors.name ? true : undefined}
          placeholder="Column name"
          className="h-11 min-w-0 flex-1 rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary"
        />
        <Button text="Add column" type="submit" isLoading={isSubmitting} />
      </div>
      {errors.name && (
        <p role="alert" className="text-xs text-danger">
          {errors.name.message}
        </p>
      )}
      {layout === "board" ? (
        <Button text="Cancel" variant="ghost" size="sm" className="self-start" onClick={close} />
      ) : (
        <p className="text-xs text-fg-muted">New columns go just before the done column.</p>
      )}
    </form>
  );
}
