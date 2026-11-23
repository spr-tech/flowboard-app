"use client";

import { useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { addedOn } from "@/components/content/board/columnMenu";
import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectColumnSummary } from "@/models/responses/projectResponses";
import { COLUMN_NAME_MAX } from "@/models/validations/boardValidation";
import { useMoveColumnMutation, useUpdateColumnMutation } from "@/services/columnsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import type { ColumnRights } from "@/utilities/helpers/projectPermissions";

type ColumnRowProps = {
  projectId: string;
  column: ProjectColumnSummary;
  /** 1-based place in the team order. */
  number: number;
  /** The neighbours in the team order (move left / right goes past them). */
  before: ProjectColumnSummary | undefined;
  after: ProjectColumnSummary | undefined;
  /** What I may do to this column (from can()). */
  rights: ColumnRights;
  isOnlyColumn: boolean;
};

const plural = (count: number) => `${count} task${count === 1 ? "" : "s"}`;

/**
 * One column in Settings › Columns: number, name (inline rename for the owner and managers with
 * manageColumns), task count, who added it, the done badge or "Set as done", move left / right in the
 * team order, and delete. Changes save as they're made.
 */
export function ColumnRow({ projectId, column, number, before, after, rights, isOnlyColumn }: ColumnRowProps) {
  const dispatch = useAppDispatch();
  const [updateColumn] = useUpdateColumnMutation();
  const [moveColumn] = useMoveColumnMutation();
  const [name, setName] = useState(column.name);

  const rename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === column.name) {
      setName(column.name);
      return;
    }
    try {
      await updateColumn({ projectId, columnId: column.id, name: trimmed }).unwrap();
      toast({ type: "success", message: `Renamed to ${trimmed}` });
    } catch {
      setName(column.name);
    }
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") event.currentTarget.blur();
    if (event.key === "Escape") {
      setName(column.name);
      event.currentTarget.blur();
    }
  };

  /** One place left (lands before `before`) or right (lands after `after`), in the team order. */
  const move = async (direction: "left" | "right") => {
    const neighbours = direction === "left" ? { beforeColumnId: before?.id } : { afterColumnId: after?.id };
    try {
      await moveColumn({ projectId, columnId: column.id, ...neighbours }).unwrap();
    } catch {
      // Put back by the optimistic update; the base query showed why.
    }
  };

  const setDone = async () => {
    try {
      await updateColumn({ projectId, columnId: column.id, isDone: true }).unwrap();
      toast({ type: "success", message: `${column.name} is now the done column` });
    } catch {
      // The base query showed why.
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-card border border-line-subtle p-3">
      <span className="w-6 text-center text-sm font-semibold text-fg-muted">{number}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {rights.rename ? (
          <input
            value={name}
            maxLength={COLUMN_NAME_MAX}
            onChange={(event) => setName(event.target.value)}
            onBlur={() => void rename()}
            onKeyDown={onKey}
            aria-label={`Name of column ${number}`}
            className="h-9 rounded-lg border-[1.5px] border-transparent bg-transparent px-2 font-semibold hover:border-line-strong focus-visible:border-fg-primary focus-visible:outline-none"
          />
        ) : (
          <span className="px-2 font-semibold">{column.name}</span>
        )}
        <span className="px-2 text-xs text-fg-muted">
          {plural(column.taskCount)} · Added by {column.createdBy.name ?? "someone"} · {addedOn(column.createdAt)}
        </span>
      </div>
      {column.isDone ? (
        <span className="rounded-full bg-status-done px-2.5 py-0.5 text-xs font-semibold text-status-done-fg">
          Done column
        </span>
      ) : (
        rights.setDone && <Button text="Set as done" variant="secondary" size="sm" onClick={() => void setDone()} />
      )}
      {(rights.reorderTeam || rights.delete) && (
        <span className="flex items-center gap-1">
          {rights.reorderTeam && (
            <>
              <Button
                variant="ghost"
                size="sm"
                startIcon={<ChevronLeft aria-hidden />}
                aria-label={`Move ${column.name} left`}
                disabled={!before}
                onClick={() => void move("left")}
              />
              <Button
                variant="ghost"
                size="sm"
                startIcon={<ChevronRight aria-hidden />}
                aria-label={`Move ${column.name} right`}
                disabled={!after}
                onClick={() => void move("right")}
              />
            </>
          )}
          {rights.delete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger"
              startIcon={<Trash2 aria-hidden />}
              aria-label={`Delete ${column.name}`}
              disabled={isOnlyColumn}
              onClick={() => dispatch(dialogOpened({ kind: "deleteColumn", columnId: column.id }))}
            />
          )}
        </span>
      )}
    </li>
  );
}
