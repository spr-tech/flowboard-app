"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { toast } from "@/components/ui/toast/toast";
import type { ProjectColumnSummary } from "@/models/responses/projectResponses";
import { COLUMN_NAME_MAX } from "@/models/validations/boardValidation";
import { useUpdateColumnMutation } from "@/services/columnsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";
import { ColumnMenu } from "./columnMenu";

type ColumnHeaderProps = {
  projectId: string;
  column: ProjectColumnSummary;
  taskCount: number;
  isOwner: boolean;
  canRename: boolean;
  isLastColumn: boolean;
  /** The grip handle, built where the column's useSortable lives (BoardColumn). */
  grip: ReactNode;
  /** Phones only: the title is a button that folds the column's body (bodyId). */
  isCollapsed: boolean;
  bodyId: string;
  onToggle: () => void;
  /** Folded on a phone, the header is where cards are dropped; highlighted while one is over it. */
  dropRef: (element: HTMLElement | null) => void;
  isDropTarget: boolean;
};

/**
 * A column's header: grip handle, title, done badge, menu (and the inline rename field).
 * Under md the title is a fold toggle with a chevron and "Name · N"; from md up it's plain text.
 * Both are always rendered and CSS shows one, so the layout never waits for JavaScript.
 */
export function ColumnHeader(props: ColumnHeaderProps) {
  const { projectId, column, taskCount, isOwner, canRename, isLastColumn, grip } = props;
  const { isCollapsed, bodyId, onToggle, dropRef, isDropTarget } = props;
  const dispatch = useAppDispatch();
  const [updateColumn] = useUpdateColumnMutation();
  const [renameText, setRenameText] = useState<string | null>(null);

  const saveRename = async () => {
    const name = renameText?.trim() ?? "";
    setRenameText(null);
    if (!name || name === column.name) return;
    try {
      await updateColumn({ projectId, columnId: column.id, name }).unwrap();
    } catch {
      // The base query showed why; the old name stays.
    }
  };

  const onRenameKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") void saveRename();
    if (event.key === "Escape") setRenameText(null);
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
    <header
      ref={dropRef}
      className={cn(
        "flex min-h-9 items-center justify-between gap-1 rounded-lg transition-colors",
        isDropTarget && "bg-surface-page outline-2 -outline-offset-2 outline-fg-primary outline-dashed"
      )}
    >
      {grip}
      {renameText !== null ? (
        <input
          value={renameText}
          autoFocus
          maxLength={COLUMN_NAME_MAX}
          onChange={(event) => setRenameText(event.target.value)}
          onKeyDown={onRenameKey}
          onBlur={() => void saveRename()}
          aria-label="Column name"
          className="h-9 min-w-0 flex-1 rounded-lg border-[1.5px] border-fg-primary bg-surface-card px-2 font-heading font-bold"
        />
      ) : (
        <h2 className="flex min-w-0 flex-1 items-center gap-2 text-base font-bold">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!isCollapsed}
            aria-controls={bodyId}
            className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-lg text-left md:hidden"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-4 shrink-0 text-fg-muted motion-safe:transition-transform motion-safe:duration-200",
                isCollapsed && "-rotate-90"
              )}
            />
            <span className="truncate">{column.name}</span>{" "}
            <span className="shrink-0 text-sm font-semibold text-fg-muted">
              · {taskCount}
              <span className="sr-only"> {taskCount === 1 ? "task" : "tasks"}</span>
            </span>
          </button>
          <span className="hidden min-w-0 items-center gap-2 md:flex">
            <span className="truncate">{column.name}</span>
            <span className="text-sm font-semibold text-fg-muted">{taskCount}</span>
          </span>
        </h2>
      )}
      <span className="flex shrink-0 items-center gap-1">
        {column.isDone && (
          <span className="rounded-full bg-status-done px-2 py-0.5 text-xs font-semibold text-status-done-fg">
            Done column
          </span>
        )}
        {renameText === null && (
          <ColumnMenu
            columnName={column.name}
            addedBy={column.createdBy.name ?? "someone"}
            addedAt={column.createdAt}
            isDone={column.isDone}
            isLastColumn={isLastColumn}
            canRename={canRename}
            isOwner={isOwner}
            onRename={() => setRenameText(column.name)}
            onSetDone={() => void setDone()}
            onDelete={() => dispatch(dialogOpened({ kind: "deleteColumn", columnId: column.id }))}
          />
        )}
      </span>
    </header>
  );
}
