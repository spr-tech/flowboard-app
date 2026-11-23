"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import type { BoardTask } from "@/models/responses/boardResponses";
import type { ProjectColumnSummary } from "@/models/responses/projectResponses";
import { cn } from "@/utilities/helpers/cn";
import { cardAreaId, columnHeaderDropId, columnSortId } from "./boardDnd";
import { ColumnHeader } from "./columnHeader";
import { QuickAddForm } from "./forms/quickAddForm";
import { TaskCard } from "./taskCard";
import type { ColumnRights } from "@/utilities/helpers/projectPermissions";

type BoardColumnProps = {
  projectId: string;
  column: ProjectColumnSummary;
  tasks: BoardTask[];
  /** What I may do to this column (from can()). */
  rights: ColumnRights;
  isLastColumn: boolean;
  today: string;
  onOpenTask: (taskId: string) => void;
  /** Phones: folded or not, and whether this is a phone (only then is a folded body inert). */
  isCollapsed: boolean;
  isPhone: boolean;
  onToggle: () => void;
};

/**
 * One column: header (grip handle, name, count, done badge, menu), its cards, quick add.
 * From md up: 300px wide in a row, always open. Under md: full width in a stack, and the body
 * folds (its height animates over 0.2s; CSS forces it open from md up, whatever was folded).
 * The column is dragged only by its handle, so column drags never clash with card drags or the menu.
 */
export function BoardColumn(props: BoardColumnProps) {
  const { projectId, column, tasks, rights, isLastColumn, today, onOpenTask } = props;
  const { isCollapsed, isPhone, onToggle } = props;
  const bodyId = `column-body-${column.id}`;
  // Destructured: the hooks lint rule treats an object holding refs as a ref itself.
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: columnSortId(column.id),
    data: { kind: "column", columnId: column.id },
  });
  // Folded on a phone: the header takes card drops instead of the (clipped) cards and card area.
  const isFoldedHere = isPhone && isCollapsed;
  const { setNodeRef: setCardAreaRef, isOver } = useDroppable({
    id: cardAreaId(column.id),
    data: { kind: "cardArea", columnId: column.id },
    disabled: isFoldedHere,
  });
  const { setNodeRef: setHeaderDropRef, isOver: isOverHeader } = useDroppable({
    id: columnHeaderDropId(column.id),
    data: { kind: "columnHeader", columnId: column.id },
    disabled: !isFoldedHere,
  });

  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex w-full flex-col rounded-card bg-surface-sunken p-3 md:w-[300px] md:shrink-0",
        isDragging && "opacity-40"
      )}
    >
      <ColumnHeader
        projectId={projectId}
        column={column}
        taskCount={tasks.length}
        rights={rights}
        isLastColumn={isLastColumn}
        grip={
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
        }
        isCollapsed={isCollapsed}
        bodyId={bodyId}
        onToggle={onToggle}
        dropRef={setHeaderDropRef}
        isDropTarget={isOverHeader}
      />

      {/* The fold: a grid row animating between 0fr and 1fr. Inert only while folded on a phone,
          so a column folded there is never unreachable on a wider screen. */}
      <div
        id={bodyId}
        inert={isFoldedHere}
        className={cn(
          "grid motion-safe:transition-[grid-template-rows] motion-safe:duration-200 md:grid-rows-[1fr]",
          isCollapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"
        )}
      >
        <div className="flex min-h-0 flex-col gap-3 max-md:overflow-hidden">
          <div
            ref={setCardAreaRef}
            className={cn(
              "mt-3 flex min-h-16 flex-col gap-2.5 rounded-card p-0.5 transition-colors",
              isOver &&
                "bg-surface-page outline-2 outline-offset-2 outline-fg-primary outline-dashed max-md:outline-offset-[-2px]"
            )}
          >
            <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  isInDoneColumn={column.isDone}
                  today={today}
                  onOpen={onOpenTask}
                  isDisabled={isFoldedHere}
                />
              ))}
            </SortableContext>
          </div>

          <QuickAddForm projectId={projectId} columnId={column.id} columnName={column.name} />
        </div>
      </div>
    </section>
  );
}
