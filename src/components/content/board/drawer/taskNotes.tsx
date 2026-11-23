"use client";

import { useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { createNoteSchema, NOTE_BODY_MAX, type CreateNoteFormValues } from "@/models/validations/boardValidation";
import { useAddNoteMutation, useDeleteNoteMutation, useListNotesQuery } from "@/services/notesService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { projectCan, type ProjectForPermissions } from "@/utilities/helpers/projectPermissions";

type TaskNotesProps = { project: ProjectForPermissions; taskId: string; meId: string | null };

/** "20 Nov, 14:05" in the viewer's own zone. */
const noteTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Notes under the description, oldest first: who wrote each and when, in a sunken box. Anyone who
 * can see the task adds one (1 to 1000 characters); the author deletes their own, the owner any.
 */
export function TaskNotes({ project, taskId, meId }: TaskNotesProps) {
  const fieldId = useId();
  const { data: notes, isLoading } = useListNotesQuery(taskId);
  const [addNote] = useAddNoteMutation();
  const [deleteNote] = useDeleteNoteMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateNoteFormValues>({ resolver: zodResolver(createNoteSchema), defaultValues: { body: "" } });

  const onSubmit = async ({ body }: CreateNoteFormValues) => {
    try {
      await addNote({ taskId, body }).unwrap();
      reset();
    } catch (error) {
      applyApiError(error, ["body"], setError);
    }
  };

  return (
    <section aria-labelledby={`${fieldId}-heading`} className="flex flex-col gap-3">
      <h3 id={`${fieldId}-heading`} className="text-sm font-semibold">
        Notes
      </h3>
      {isLoading && <p className="text-sm text-fg-muted">Loading notes…</p>}
      {notes && notes.length === 0 && <p className="text-sm text-fg-muted">No notes yet.</p>}
      {notes && notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => {
            const mayDelete = projectCan(project, meId, "note.delete", { note: { authorId: note.author.id } }).allowed;
            return (
              <li key={note.id} className="flex gap-3 rounded-card bg-surface-sunken p-3">
                <Avatar name={note.author.name ?? "?"} imageUrl={note.author.image} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-xs text-fg-muted">
                    <span className="font-semibold text-fg-primary">{note.author.name ?? "Someone"}</span> ·{" "}
                    {noteTime(note.createdAt)}
                  </p>
                  <p className="text-sm whitespace-pre-wrap wrap-break-word">{note.body}</p>
                </div>
                {mayDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    startIcon={<Trash2 aria-hidden />}
                    aria-label={`Delete note from ${note.author.name ?? "someone"}`}
                    onClick={() =>
                      void deleteNote({ taskId, noteId: note.id })
                        .unwrap()
                        .catch(() => undefined)
                    }
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
        <label htmlFor={fieldId} className="sr-only">
          Add a note
        </label>
        <textarea
          id={fieldId}
          {...register("body")}
          rows={2}
          maxLength={NOTE_BODY_MAX}
          aria-invalid={errors.body ? true : undefined}
          placeholder="Add a note"
          className="w-full rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 py-2 text-[15px] outline-none focus-visible:border-fg-primary aria-invalid:border-danger"
        />
        {errors.body && (
          <p role="alert" className="text-sm text-danger">
            {errors.body.message}
          </p>
        )}
        <Button
          text="Add note"
          type="submit"
          size="sm"
          variant="secondary"
          isLoading={isSubmitting}
          className="self-end"
        />
      </form>
    </section>
  );
}
