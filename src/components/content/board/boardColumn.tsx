"use client";

import { useState, type KeyboardEvent } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { toast } from "@/components/ui/toast/toast";
import type { BoardTask } from "@/models/responses/boardResponses";
import type { ProjectColumnSummary } from "@/models/responses/projectResponses";
import { COLUMN_NAME_MAX } from "@/models/validations/boardValidation";
import { useUpdateColumnMutation } from "@/services/columnsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogOpened } from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";
import { cardAreaId, columnSortId } from "./boardDnd";
import { ColumnMenu } from "./columnMenu";
import { QuickAddForm } from "./forms/quickAddForm";
import { TaskCard } from "./taskCard";

type BoardColumnProps = {
  projectId: string;
  column: ProjectColumnSummary;
  tasks: BoardTask[];
  isOwner: boolean;
  /** The owner, or the member who added this column. */
  canRename: boolean;
  isLastColumn: boolean;
  today: string;
  onOpenTask: (taskId: string) => void;
};

/**
 * One 300px column: header (grip handle, name, count, done badge, menu), its cards, quick add.
 * The column is dragged only by its handle, so column drags never clash with card drags or the menu.
 */
export function BoardColumn(props: BoardColumnProps) {
  const { projectId, column, tasks, isOwner, canRename, isLastColumn, today, onOpenTask } = props;
  const dispatch = useAppDispatch();
  const [updateColumn] = useUpdateColumnMutation();
  const [renameText, setRenameText] = useState<string | null>(null);
  // Destructured: the hooks lint rule treats an object holding refs as a ref itself.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: columnSortId(column.id),
    data: { kind: "column", columnId: column.id },
  });
  const { setNodeRef: setCardAreaRef, isOver } = useDroppable({
    id: cardAreaId(column.id),
    data: { kind: "cardArea", columnId: column.id },
  });

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
      ref={setNodeRef}
      aria-label={column.name}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex w-[300px] shrink-0 flex-col gap-3 rounded-card bg-surface-sunken p-3",
        isDragging && "opacity-40"
      )}
    >
      <header className="flex min-h-9 items-center justify-between gap-1">
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move column ${column.name}`}
          className="inline-flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-fg-muted hover:bg-surface-page hover:text-fg-primary active:cursor-grabbing"
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
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

      <div
        ref={setCardAreaRef}
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
