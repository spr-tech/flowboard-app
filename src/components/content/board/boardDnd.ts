// Drag-and-drop plumbing for the board. Cards and columns share one DndContext (dnd-kit allows only
// one per tree), so every draggable and drop target says what it is in its data: a card, a
// column's card area, or a whole column. Collision detection and keyboard movement then only ever
// consider targets of the same kind, so a column drag can't land on a card or the other way round.
import {
  closestCenter,
  closestCorners,
  type Announcements,
  type CollisionDetection,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { columnTasks, type BoardFilters } from "@/utilities/helpers/boardView";

export type DragKind = "card" | "cardArea" | "column";

/** Ids: cards use their own id; these keep the other kinds from colliding with them. */
export const columnSortId = (columnId: string) => `column:${columnId}`;
export const cardAreaId = (columnId: string) => `area:${columnId}`;

const kindOf = (container: { data: { current?: Record<string, unknown> } }) =>
  container.data.current?.kind as DragKind | undefined;

/** What a dragged item may land on: a column on columns; a card on cards and card areas. */
const accepts = (dragging: DragKind | undefined, target: DragKind | undefined) =>
  dragging === "column" ? target === "column" : target === "card" || target === "cardArea";

export const collisionByKind: CollisionDetection = (args) => {
  const dragging = kindOf(args.active);
  const droppableContainers = args.droppableContainers.filter((container) => accepts(dragging, kindOf(container)));
  return (dragging === "column" ? closestCenter : closestCorners)({ ...args, droppableContainers });
};

/**
 * dnd-kit's sortable keyboard movement (arrow keys jump to the nearest target in that direction),
 * restricted to targets of the same kind. It lists candidates with `getEnabled()` and then looks
 * the chosen one up with `get(id)`, so the wrapper passes both through.
 */
export const keyboardByKind: KeyboardCoordinateGetter = (event, args) => {
  const { droppableContainers, active } = args.context;
  const dragging = active ? kindOf(active) : undefined;
  const filtered = {
    getEnabled: () =>
      droppableContainers.getEnabled().filter((container: DroppableContainer) => accepts(dragging, kindOf(container))),
    get: (id: Parameters<typeof droppableContainers.get>[0]) => droppableContainers.get(id),
  } as typeof droppableContainers;
  return sortableKeyboardCoordinates(event, { ...args, context: { ...args.context, droppableContainers: filtered } });
};

/** Where a card drop lands: the target column and the index among its other visible cards. */
export function resolveDrop(
  project: Pick<ProjectDetail, "tasks">,
  filters: BoardFilters,
  activeId: string,
  over: { id: string; columnId: string; kind: DragKind }
) {
  const list = columnTasks(project.tasks, over.columnId, filters);
  const others = list.filter((task) => task.id !== activeId);
  const fromIndex = list.findIndex((task) => task.id === activeId);
  let index: number;
  if (over.kind === "cardArea") index = others.length;
  // Same column: the card takes the hovered card's place (as dnd-kit's arrayMove does).
  else if (fromIndex >= 0) index = list.findIndex((task) => task.id === over.id);
  // Another column: it goes just above the hovered card.
  else index = others.findIndex((task) => task.id === over.id);
  return { others, fromIndex, index: Math.max(0, index) };
}

/** Screen reader announcements in plain English, for cards and for columns. */
export function boardAnnouncements(project: ProjectDetail, isOwner: boolean): Announcements {
  const columnName = (columnId: unknown) => project.columns.find((column) => column.id === columnId)?.name ?? "";
  const label = (data: Record<string, unknown> | undefined) =>
    data?.kind === "column" ? `column ${columnName(data.columnId)}` : String(data?.title ?? "the card");
  const whoSees = isOwner ? "This changes the team order for everyone." : "This changes only your view.";

  return {
    onDragStart: ({ active }) =>
      active.data.current?.kind === "column"
        ? `Picked up ${label(active.data.current)}. Use the left and right arrow keys to move it. ${whoSees}`
        : `Picked up ${label(active.data.current)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return undefined;
      return active.data.current?.kind === "column"
        ? `${label(active.data.current)} is next to ${columnName(over.data.current?.columnId)}.`
        : `${label(active.data.current)} is over ${columnName(over.data.current?.columnId)}.`;
    },
    onDragEnd: ({ active, over }) => {
      if (!over) return `${label(active.data.current)} was put back.`;
      return active.data.current?.kind === "column"
        ? `${label(active.data.current)} dropped. ${whoSees}`
        : `${label(active.data.current)} dropped in ${columnName(over.data.current?.columnId)}.`;
    },
    onDragCancel: ({ active }) => `Moving ${label(active.data.current)} was cancelled. It's back where it was.`,
  };
}
