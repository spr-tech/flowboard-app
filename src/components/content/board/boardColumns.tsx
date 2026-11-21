"use client";

import { useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { toast } from "@/components/ui/toast/toast";
import type { BoardTask } from "@/models/responses/boardResponses";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { useMoveTaskMutation } from "@/services/tasksService";
import { columnTasks, dropNeighbours, type BoardFilters } from "@/utilities/helpers/boardView";
import { AddColumnForm } from "./forms/addColumnForm";
import { BoardColumn } from "./boardColumn";
import { TaskCardFace } from "./taskCard";

type BoardColumnsProps = {
  project: ProjectDetail;
  filters: BoardFilters;
  today: string;
  onOpenTask: (taskId: string) => void;
};

/** Where a drop lands: the target column and the index among its other visible cards. */
export function resolveDrop(
  project: Pick<ProjectDetail, "tasks">,
  filters: BoardFilters,
  activeId: string,
  over: { id: string; columnId: string }
) {
  const list = columnTasks(project.tasks, over.columnId, filters);
  const others = list.filter((task) => task.id !== activeId);
  const fromIndex = list.findIndex((task) => task.id === activeId);
  let index: number;
  if (over.id.startsWith("column:")) index = others.length;
  // Same column: the card takes the hovered card's place (as dnd-kit's arrayMove does).
  else if (fromIndex >= 0) index = list.findIndex((task) => task.id === over.id);
  // Another column: it goes just above the hovered card.
  else index = others.findIndex((task) => task.id === over.id);
  return { list, others, fromIndex, index: Math.max(0, index) };
}

/**
 * The columns inside one DndContext. Pointer: dragging starts after 6px, so a click still opens
 * a card. Keyboard: Space picks up, the arrow keys move, Space drops, Esc cancels. The drop goes
 * through moveTask, which moves the card in the cache at once (optimistic).
 */
export function BoardColumns({ project, filters, today, onOpenTask }: BoardColumnsProps) {
  const [moveTask] = useMoveTaskMutation();
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null);
  // A drop is followed by a click on the card; this ignores that one click.
  const justDropped = useRef(false);
  const isOwner = project.me.role === "OWNER";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space"] },
    })
  );

  const columnName = (columnId: unknown) => project.columns.find((column) => column.id === columnId)?.name ?? "";
  const titleOf = (id: unknown) => project.tasks.find((task) => task.id === id)?.title ?? "the card";
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${titleOf(active.id)} is over ${columnName(over.data.current?.columnId)}.` : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `${titleOf(active.id)} dropped in ${columnName(over.data.current?.columnId)}.`
        : `${titleOf(active.id)} was put back.`,
    onDragCancel: ({ active }) => `Moving ${titleOf(active.id)} was cancelled. It's back where it was.`,
  };

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(project.tasks.find((task) => task.id === active.id) ?? null);
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveTask(null);
    justDropped.current = true;
    setTimeout(() => (justDropped.current = false), 0);
    const columnId = over?.data.current?.columnId;
    if (!over || typeof columnId !== "string") return;

    const taskId = String(active.id);
    const fromColumn = project.tasks.find((task) => task.id === taskId)?.columnId;
    const { others, fromIndex, index } = resolveDrop(project, filters, taskId, { id: String(over.id), columnId });
    if (fromColumn === columnId && index === fromIndex) return;

    try {
      await moveTask({ projectId: project.id, taskId, columnId, ...dropNeighbours(others, index) }).unwrap();
      if (fromColumn !== columnId) toast({ type: "success", message: `Moved to ${columnName(columnId)}` });
    } catch {
      // Already put back by moveTask; the base query showed why.
    }
  };

  const openUnlessJustDropped = (taskId: string) => {
    if (!justDropped.current) onOpenTask(taskId);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveTask(null)}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            "To move a card, press Space, use the arrow keys, then press Space again to drop it or Escape to cancel. Press Enter to open it.",
        },
      }}
    >
      <div className="-mx-4 flex items-start gap-4 overflow-x-auto px-4 pb-4 md:-mx-8 md:px-8">
        {project.columns.map((column) => (
          <BoardColumn
            key={column.id}
            projectId={project.id}
            column={column}
            tasks={columnTasks(project.tasks, column.id, filters)}
            isOwner={isOwner}
            isLastColumn={project.columns.length === 1}
            today={today}
            onOpenTask={openUnlessJustDropped}
          />
        ))}
        {isOwner && <AddColumnForm projectId={project.id} />}
      </div>

      <DragOverlay>
        {activeTask && (
          <div className="w-[276px] rotate-2 cursor-grabbing rounded-card border border-line-subtle bg-surface-card p-3.5 shadow-xl">
            <TaskCardFace
              task={activeTask}
              isInDoneColumn={project.columns.some((column) => column.id === activeTask.columnId && column.isDone)}
              today={today}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
