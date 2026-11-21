"use client";

import { useEffect, useId, useRef, useState } from "react";

import { AddColumnForm } from "@/components/content/board/forms/addColumnForm";
import { DeleteColumnDialog } from "@/components/content/board/modals/deleteColumnDialog";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import {
  MEMBER_COLUMN_LIMIT_MAX,
  MEMBER_COLUMN_LIMIT_MIN,
  memberColumnLimitField,
} from "@/models/validations/projectValidation";
import { useUpdateProjectMutation } from "@/services/projectsService";
import { cn } from "@/utilities/helpers/cn";
import { ColumnRow } from "./columnRow";

/** A limit typed into the number field saves after a short pause, so "10" isn't saved as "1" first. */
const LIMIT_SAVE_DELAY_MS = 500;

/**
 * Settings › Columns (docs/designs/project-settings.md): who may add columns, then the columns in
 * the team order, then Add column (by the same rules as the board).
 */
export function ColumnsSection({ project, meId }: { project: ProjectDetail; meId: string | null }) {
  const isOwner = project.me.role === "OWNER";
  const { membersCanAddColumns, memberColumnLimit, memberColumnCount } = project.columnPermissions;
  const memberMayAdd = membersCanAddColumns && memberColumnCount < memberColumnLimit;

  return (
    <div className="flex flex-col gap-5">
      {isOwner ? (
        <ColumnPermissionsControl project={project} />
      ) : (
        <p className="text-sm text-fg-secondary">
          {membersCanAddColumns
            ? `Members can add up to ${memberColumnLimit} columns · ${memberColumnCount} used`
            : "Only the owner can add columns"}
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {project.columns.map((column, index) => (
          <ColumnRow
            key={`${column.id}|${column.name}`}
            projectId={project.id}
            column={column}
            number={index + 1}
            before={project.columns[index - 1]}
            after={project.columns[index + 1]}
            isOwner={isOwner}
            canRename={isOwner || column.createdBy.id === meId}
            isOnlyColumn={project.columns.length === 1}
          />
        ))}
      </ol>

      {(isOwner || memberMayAdd) && <AddColumnForm projectId={project.id} layout="row" />}
      <DeleteColumnDialog project={project} allowDeletingTasks={false} />
    </div>
  );
}

/** The owner's switch and limit. Both save on change, with a toast. */
function ColumnPermissionsControl({ project }: { project: ProjectDetail }) {
  const [updateProject, { isLoading }] = useUpdateProjectMutation();
  const { membersCanAddColumns, memberColumnLimit, memberColumnCount } = project.columnPermissions;
  const [limitText, setLimitText] = useState(String(memberColumnLimit));
  const [limitError, setLimitError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ids = { switch: useId(), limit: useId() };

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  const save = async (changes: { membersCanAddColumns?: boolean; memberColumnLimit?: number }) => {
    try {
      await updateProject({ projectId: project.id, ...changes }).unwrap();
      toast({ type: "success", message: "Column settings saved" });
    } catch {
      // The base query showed why; the cache still holds the saved settings.
    }
  };

  const onLimit = (text: string) => {
    setLimitText(text);
    if (timer.current) clearTimeout(timer.current);
    const parsed = memberColumnLimitField.safeParse(Number(text));
    if (text === "" || !parsed.success) {
      setLimitError(`Enter a number from ${MEMBER_COLUMN_LIMIT_MIN} to ${MEMBER_COLUMN_LIMIT_MAX}`);
      return;
    }
    setLimitError(null);
    if (parsed.data === memberColumnLimit) return;
    timer.current = setTimeout(() => void save({ memberColumnLimit: parsed.data }), LIMIT_SAVE_DELAY_MS);
  };

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-page p-4">
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={ids.switch} className="font-semibold">
          Members can add columns
        </label>
        <button
          id={ids.switch}
          type="button"
          role="switch"
          aria-checked={membersCanAddColumns}
          disabled={isLoading}
          onClick={() => void save({ membersCanAddColumns: !membersCanAddColumns })}
          className={cn(
            "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait",
            membersCanAddColumns ? "bg-surface-inverse" : "bg-line-strong"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block size-5 rounded-full bg-surface-card shadow transition-transform",
              membersCanAddColumns ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
      {membersCanAddColumns && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={ids.limit}>Up to</label>
          <input
            id={ids.limit}
            type="number"
            inputMode="numeric"
            min={MEMBER_COLUMN_LIMIT_MIN}
            max={MEMBER_COLUMN_LIMIT_MAX}
            value={limitText}
            onChange={(event) => onLimit(event.target.value)}
            aria-invalid={limitError ? true : undefined}
            aria-describedby={`${ids.limit}-usage`}
            className="h-9 w-16 rounded-lg border-[1.5px] border-line-strong bg-surface-card px-2 text-center aria-invalid:border-danger"
          />
          <span>columns</span>
          <span id={`${ids.limit}-usage`} className="text-fg-muted">
            · {memberColumnCount} of {memberColumnLimit} used
          </span>
          {limitError && (
            <p role="alert" className="w-full text-danger">
              {limitError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
