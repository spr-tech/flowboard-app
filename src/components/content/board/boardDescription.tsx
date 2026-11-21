"use client";

import { useState, type KeyboardEvent } from "react";

import { PROJECT_DESCRIPTION_MAX, projectDescriptionField } from "@/models/validations/projectValidation";
import { useUpdateProjectMutation } from "@/services/projectsService";

type BoardDescriptionProps = { projectId: string; description: string | null; isOwner: boolean };

/**
 * The description under the board's name. When there's none, the owner gets a quiet
 * "+ Add a description" that opens an inline field (Enter or blur saves, Esc cancels);
 * members see nothing.
 */
export function BoardDescription({ projectId, description, isOwner }: BoardDescriptionProps) {
  const [updateProject] = useUpdateProjectMutation();
  const [draft, setDraft] = useState<string | null>(null);

  if (description) return <p className="max-w-2xl text-fg-secondary">{description}</p>;
  if (!isOwner) return null;

  if (draft === null) {
    return (
      <button
        type="button"
        onClick={() => setDraft("")}
        className="self-start text-sm font-semibold text-fg-muted underline-offset-4 hover:text-fg-primary hover:underline"
      >
        + Add a description
      </button>
    );
  }

  const save = async () => {
    const parsed = projectDescriptionField.safeParse(draft);
    setDraft(null);
    if (!parsed.success || parsed.data === null) return;
    try {
      await updateProject({ projectId, description: parsed.data }).unwrap();
    } catch {
      // The base query showed why.
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void save();
    if (event.key === "Escape") setDraft(null);
  };

  return (
    <input
      value={draft}
      autoFocus
      maxLength={PROJECT_DESCRIPTION_MAX}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={() => void save()}
      aria-label="Project description"
      placeholder="e.g. Rebuilding the marketing site before the January launch"
      className="h-10 w-full max-w-2xl rounded-input border-[1.5px] border-line-strong bg-surface-card px-3 text-[15px] outline-none focus-visible:border-fg-primary"
    />
  );
}
