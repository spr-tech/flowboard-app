"use client";

import { useState, type KeyboardEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { toast } from "@/components/ui/toast/toast";
import type { BoardTask } from "@/models/responses/boardResponses";
import type { ProjectColumnSummary } from "@/models/responses/projectResponses";
import { COLUMN_NAME_MAX } from "@/models/validations/boardValidation";
import { useUpdateColumnMutation } from "@/services/columnsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";
import { ColumnMenu } from "./columnMenu";
import { QuickAddForm } from "./forms/quickAddForm";
import { TaskCard } from "./taskCard";

/** Drop target id for a column's empty space (cards use their own id). */
export const columnDropId = (columnId: string) => `column:${columnId}`;

type BoardColumnProps = {
  projectId: string;
  column: ProjectColumnSummary;
  tasks: BoardTask[];
  isOwner: boolean;
  isLastColumn: boolean;
  today: string;
  onOpenTask: (taskId: string) => void;
};

/** One 300px column: header (name, count, done badge, owner menu), its cards, and quick add. */
export function BoardColumn({ projectId, column, tasks, isOwner, isLastColumn, today, onOpenTask }: BoardColumnProps) {
  const dispatch = useAppDispatch();
  const [updateColumn] = useUpdateColumnMutation();
  const [renameText, setRenameText] = useState<string | null>(null);
  const { setNodeRef, isOver } = useDroppable({ id: columnDropId(column.id), data: { columnId: column.id } });

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
    <section
      aria-label={column.name}
      className="flex w-[300px] shrink-0 flex-col gap-3 rounded-card bg-surface-sunken p-3"
    >
      <header className="flex min-h-9 items-center justify-between gap-2 px-1">
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
          <h2 className="flex min-w-0 items-center gap-2 text-base font-bold">
            <span className="truncate">{column.name}</span>
            <span className="text-sm font-semibold text-fg-muted">{tasks.length}</span>
          </h2>
        )}
        <span className="flex shrink-0 items-center gap-1">
          {column.isDone && (
            <span className="rounded-full bg-status-done px-2 py-0.5 text-xs font-semibold text-status-done-fg">
              Done column
            </span>
          )}
          {isOwner && renameText === null && (
            <ColumnMenu
              columnName={column.name}
              isDone={column.isDone}
              isLastColumn={isLastColumn}
              onRename={() => setRenameText(column.name)}
              onSetDone={() => void setDone()}
              onDelete={() => dispatch(dialogOpened({ kind: "deleteColumn", columnId: column.id }))}
            />
          )}
        </span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-16 flex-col gap-2.5 rounded-card p-0.5 transition-colors",
          isOver && "bg-surface-page outline-2 outline-offset-2 outline-fg-primary outline-dashed"
        )}
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} isInDoneColumn={column.isDone} today={today} onOpen={onOpenTask} />
          ))}
        </SortableContext>
      </div>

      <QuickAddForm projectId={projectId} columnId={column.id} columnName={column.name} />
    </section>
  );
}
