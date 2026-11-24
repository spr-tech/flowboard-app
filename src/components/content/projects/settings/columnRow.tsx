"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Trash2 } from "lucide-react";

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

/** "Muizz Jimoh" → "Muizz J.", so the details line stays short on a phone. */
const shortName = (name: string | null) => {
  const [first, second] = (name ?? "someone").trim().split(/\s+/);
  return second ? `${first} ${second[0]}.` : first;
};

/** "23 Nov": the day the column was added, short (the full date is in the line's tooltip). */
const shortDay = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// 44px tap targets on phones; the usual 36px from sm up.
const tap = "max-sm:h-11 max-sm:min-w-11";

/**
 * One column in Settings › Columns: number, name (inline rename for the owner and managers with
 * manageColumns), task count, who added it, the done badge or "Set as done", move left / right in the
 * team order, and delete. Changes save as they're made. On phones it stacks: the name and details
 * on one line, the actions under them, with the move arrows pointing up and down.
 */
export function ColumnRow({ projectId, column, number, before, after, rights, isOnlyColumn }: ColumnRowProps) {
  const dispatch = useAppDispatch();
  const [updateColumn] = useUpdateColumnMutation();
  const [moveColumn] = useMoveColumnMutation();
  const [name, setName] = useState(column.name);
  const nameRef = useRef<HTMLTextAreaElement>(null);

  // A long name wraps instead of being cut off: the box grows to fit (field-sizing does this in
  // browsers that support it; this covers the rest).
  useLayoutEffect(() => {
    const box = nameRef.current;
    if (!box) return;
    box.style.height = "auto";
    box.style.height = `${box.scrollHeight}px`;
  }, [name]);

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

  const onKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter") {
      // A name is one line: Enter saves instead of adding a line break.
      event.preventDefault();
      event.currentTarget.blur();
    }
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

  const addedBy = column.createdBy.name ?? "someone";
  const hasActions = column.isDone || rights.setDone || rights.reorderTeam || rights.delete;

  return (
    <li className="flex flex-col gap-2 rounded-card border border-line-subtle p-3 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <span className="w-6 shrink-0 pt-2 text-center text-sm font-semibold text-fg-muted sm:pt-0">{number}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {rights.rename ? (
            <textarea
              ref={nameRef}
              rows={1}
              value={name}
              maxLength={COLUMN_NAME_MAX}
              onChange={(event) => setName(event.target.value.replace(/\n/g, " "))}
              onBlur={() => void rename()}
              onKeyDown={onKey}
              aria-label={`Name of column ${number}`}
              className="field-sizing-content min-h-9 w-full resize-none overflow-hidden rounded-lg border-[1.5px] border-transparent bg-transparent px-2 py-1.5 leading-snug font-semibold wrap-break-word hover:border-line-strong focus-visible:border-fg-primary focus-visible:outline-none"
            />
          ) : (
            <span className="px-2 font-semibold wrap-break-word">{column.name}</span>
          )}
          <span className="px-2 text-xs text-fg-muted" title={`Added by ${addedBy} on ${addedOn(column.createdAt)}`}>
            {plural(column.taskCount)} · {shortName(column.createdBy.name)} · {shortDay(column.createdAt)}
          </span>
        </div>
      </div>
      {hasActions && (
        <div className="flex flex-wrap items-center gap-2 pl-9 sm:flex-nowrap sm:pl-0">
          {column.isDone ? (
            <span className="rounded-full bg-status-done px-2.5 py-0.5 text-xs font-semibold text-status-done-fg">
              Done column
            </span>
          ) : (
            rights.setDone && (
              <Button
                text="Set as done"
                variant="secondary"
                size="sm"
                className="max-sm:h-11"
                onClick={() => void setDone()}
              />
            )
          )}
          {(rights.reorderTeam || rights.delete) && (
            <span className="ml-auto flex items-center gap-1">
              {rights.reorderTeam && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={tap}
                    startIcon={
                      <>
                        <ChevronUp aria-hidden className="sm:hidden" />
                        <ChevronLeft aria-hidden className="max-sm:hidden" />
                      </>
                    }
                    aria-label={`Move ${column.name} left`}
                    disabled={!before}
                    onClick={() => void move("left")}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className={tap}
                    startIcon={
                      <>
                        <ChevronDown aria-hidden className="sm:hidden" />
                        <ChevronRight aria-hidden className="max-sm:hidden" />
                      </>
                    }
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
                  className={`${tap} text-danger`}
                  startIcon={<Trash2 aria-hidden />}
                  aria-label={`Delete ${column.name}`}
                  disabled={isOnlyColumn}
                  onClick={() => dispatch(dialogOpened({ kind: "deleteColumn", columnId: column.id }))}
                />
              )}
            </span>
          )}
        </div>
      )}
    </li>
  );
}
