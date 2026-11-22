"use client";

import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { toast } from "@/components/ui/toast/toast";
import type { BoardTask } from "@/models/responses/boardResponses";
import type { ProjectColumnSummary, ProjectDetail } from "@/models/responses/projectResponses";
import { useMoveColumnMutation, useSetColumnOrderMutation } from "@/services/columnsService";
import { useMoveTaskMutation } from "@/services/tasksService";
import { columnTasks, dropNeighbours, type BoardFilters } from "@/utilities/helpers/boardView";
import { moveId, orderColumns } from "@/utilities/helpers/columnOrder";
import { useCollapsedColumns } from "@/utilities/hooks/useCollapsedColumns";
import { useIsPhone } from "@/utilities/hooks/useMediaQuery";
import { AddColumnArea } from "./addColumnArea";
import { BoardColumn } from "./boardColumn";
import {
  boardAnnouncements,
  collisionByKind,
  columnSortId,
  isCardDropKind,
  keyboardByKind,
  resolveDrop,
  type CardDropKind,
} from "./boardDnd";
import { TaskCardFace } from "./taskCard";

type BoardColumnsProps = {
  project: ProjectDetail;
  filters: BoardFilters;
  meId: string | null;
  today: string;
  onOpenTask: (taskId: string) => void;
};

/**
 * The columns inside one DndContext, for two kinds of drag:
 * - cards (mouse after 6px, so a click still opens one; touch after a 250ms press-and-hold, so a
 *   swipe still scrolls; or Space on a focused card), through the optimistic moveTask;
 * - columns, only by their grip handle: the owner's drags change the team order (moveColumn),
 *   a member's only their own view (setColumnOrder). Both optimistic.
 * Keyboard: Space picks up, arrows move, Space drops, Esc cancels.
 * Phones (under md): the columns stack, so columns sort up and down, and a folded column's header
 * takes card drops (the card goes to the bottom of that column).
 */
export function BoardColumns({ project, filters, meId, today, onOpenTask }: BoardColumnsProps) {
  const [moveTask] = useMoveTaskMutation();
  const [moveColumn] = useMoveColumnMutation();
  const [setColumnOrder] = useSetColumnOrderMutation();
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  const [activeColumn, setActiveColumn] = useState<ProjectColumnSummary | null>(null);
  // A drop is followed by a click on the card; this ignores that one click.
  const justDropped = useRef(false);
  const isOwner = project.me.role === "OWNER";
  const columns = orderColumns(project.columns, project.me.columnOrder);
  // Layout is CSS (md: classes); this is only for dnd-kit's direction and inert folds.
  const isPhone = useIsPhone();
  const folds = useCollapsedColumns(project.id, project.columns);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardByKind,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current;
    if (data?.kind === "column") setActiveColumn(columns.find((column) => column.id === data.columnId) ?? null);
    else setActiveTask(project.tasks.find((task) => task.id === active.id) ?? null);
  };

  const endDrag = () => {
    setActiveTask(null);
    setActiveColumn(null);
    justDropped.current = true;
    setTimeout(() => (justDropped.current = false), 0);
  };

  const dropColumn = async (columnId: string, overColumnId: string) => {
    const ids = columns.map((column) => column.id);
    const from = ids.indexOf(columnId);
    const to = ids.indexOf(overColumnId);
    if (from < 0 || to < 0 || from === to) return;
    const next = moveId(ids, from, to);
    try {
      if (isOwner) {
        // The owner sees the team order, so the new neighbours are the team neighbours.
        const neighbours = { afterColumnId: next[to - 1], beforeColumnId: next[to + 1] };
        await moveColumn({ projectId: project.id, columnId, ...neighbours }).unwrap();
      } else {
        await setColumnOrder({ projectId: project.id, columnIds: next }).unwrap();
      }
    } catch {
      // Already put back by the optimistic update; the base query showed why.
    }
  };

  const dropCard = async (taskId: string, over: { id: string; columnId: string; kind: CardDropKind }) => {
    const fromColumn = project.tasks.find((task) => task.id === taskId)?.columnId;
    const { others, fromIndex, index } = resolveDrop(project, filters, taskId, over);
    if (fromColumn === over.columnId && index === fromIndex) return;
    try {
      await moveTask({
        projectId: project.id,
        taskId,
        columnId: over.columnId,
        ...dropNeighbours(others, index),
      }).unwrap();
      const name = project.columns.find((column) => column.id === over.columnId)?.name;
      if (fromColumn !== over.columnId) toast({ type: "success", message: `Moved to ${name}` });
    } catch {
      // Already put back by moveTask; the base query showed why.
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    endDrag();
    const dragged = active.data.current;
    const target = over?.data.current;
    if (!over || typeof target?.columnId !== "string") return;
    if (dragged?.kind === "column") void dropColumn(String(dragged.columnId), target.columnId);
    else if (isCardDropKind(target.kind)) {
      void dropCard(String(active.id), { id: String(over.id), columnId: target.columnId, kind: target.kind });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionByKind}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={endDrag}
      accessibility={{
        announcements: boardAnnouncements(project, isOwner, isPhone),
        screenReaderInstructions: {
          draggable:
            "To move a card or a column, press Space, use the arrow keys, then press Space again to drop it or Escape to cancel. Press Enter on a card to open it.",
        },
      }}
    >
      {/* Phones: a full-width stack. md and up: the horizontal row, unchanged. */}
      <div className="flex flex-col gap-3 pb-4 md:-mx-8 md:flex-row md:items-start md:gap-4 md:overflow-x-auto md:px-8">
        <SortableContext
          items={columns.map((column) => columnSortId(column.id))}
          strategy={isPhone ? verticalListSortingStrategy : horizontalListSortingStrategy}
        >
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              projectId={project.id}
              column={column}
              tasks={columnTasks(project.tasks, column.id, filters)}
              isOwner={isOwner}
              canRename={isOwner || column.createdBy.id === meId}
              isLastColumn={project.columns.length === 1}
              today={today}
              onOpenTask={(taskId) => !justDropped.current && onOpenTask(taskId)}
              isCollapsed={folds.isCollapsed(column)}
              isPhone={isPhone}
              onToggle={() => folds.toggle(column.id)}
            />
          ))}
        </SortableContext>
        <AddColumnArea project={project} />
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-full rotate-2 cursor-grabbing md:w-[276px] rounded-card border border-line-subtle bg-surface-card p-3.5 shadow-xl">
            <TaskCardFace
              task={activeTask}
              isInDoneColumn={project.columns.some((column) => column.id === activeTask.columnId && column.isDone)}
              today={today}
            />
          </div>
        )}
        {activeColumn && (
          <div className="flex w-full rotate-1 cursor-grabbing md:w-[300px] flex-col gap-2 rounded-card bg-surface-sunken p-4 shadow-xl">
            <span className="font-heading font-bold">{activeColumn.name}</span>
            <span className="text-sm text-fg-muted">
              {columnTasks(project.tasks, activeColumn.id, filters).length} tasks
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
