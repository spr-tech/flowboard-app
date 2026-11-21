"use client";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { AddColumnForm } from "./forms/addColumnForm";

/**
 * "+ Add column", by who may add (docs/designs/app-screens.md): the owner always; a member while
 * members may add columns, with how many of the shared slots are used, or a disabled button with
 * the limit message once they're all used; nothing for members while the switch is off.
 */
export function AddColumnArea({ project }: { project: Pick<ProjectDetail, "id" | "me" | "columnPermissions"> }) {
  const { membersCanAddColumns, memberColumnLimit, memberColumnCount } = project.columnPermissions;
  if (project.me.role === "OWNER") return <AddColumnForm projectId={project.id} />;
  if (!membersCanAddColumns) return null;

  const usage = `${memberColumnCount} of ${memberColumnLimit} member columns used`;
  if (memberColumnCount >= memberColumnLimit) {
    return (
      <div className="flex w-[300px] shrink-0 flex-col gap-1.5 rounded-card border-2 border-dashed border-line-strong p-3">
        <button type="button" disabled className="h-11 cursor-not-allowed text-left font-semibold text-fg-muted">
          + Add column
        </button>
        <p role="note" className="text-sm text-fg-muted">
          Column limit reached ({memberColumnCount} of {memberColumnLimit}). The owner can raise it.
        </p>
      </div>
    );
  }
  return (
    <div className="flex w-[300px] shrink-0 flex-col gap-1.5">
      <AddColumnForm projectId={project.id} />
      <p className="px-1 text-sm text-fg-muted">{usage}</p>
    </div>
  );
}
