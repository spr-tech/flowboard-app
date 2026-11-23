// Pure board logic for the browser: which cards show in which column, in what order, and what a
// drop means. Kept out of components so it's tested without dnd-kit or a screen.
import type { BoardTask } from "@/models/responses/boardResponses";
import type { BoardPriorityFilter } from "@/stores/uiSlice";

export type BoardFilters = {
  priority: BoardPriorityFilter;
  onlyMine: boolean;
  /** Who "my" is; null while unknown (then "only my tasks" shows nothing). */
  meId: string | null;
  /** Tasks in their Undo window after a delete: never shown. */
  hiddenIds: readonly string[];
};

const byPosition = (a: BoardTask, b: BoardTask) => a.position - b.position;

/** The tasks a column shows, top to bottom: its own, minus pending deletes, minus filtered-out ones. */
export function columnTasks(tasks: readonly BoardTask[], columnId: string, filters: BoardFilters): BoardTask[] {
  return tasks
    .filter(
      (task) =>
        task.columnId === columnId &&
        !filters.hiddenIds.includes(task.id) &&
        (filters.priority === "all" || task.priority === filters.priority) &&
        (!filters.onlyMine || (filters.meId !== null && task.assignee?.id === filters.meId))
    )
    .sort(byPosition);
}

/**
 * What to tell the server when a card is dropped at `index` among a column's cards (the moved card
 * not included): the card above it and the card below it, if any.
 */
export function dropNeighbours(
  others: readonly Pick<BoardTask, "id">[],
  index: number
): { afterTaskId?: string; beforeTaskId?: string } {
  const above = others[index - 1];
  const below = others[index];
  return { ...(above ? { afterTaskId: above.id } : {}), ...(below ? { beforeTaskId: below.id } : {}) };
}

/** "Today", "Tomorrow", "3d late" or "20 Nov" for a due day, against the viewer's `today`. */
export function dueChip(dueDate: string, today: string): { label: string; tone: "late" | "today" | "soon" | "later" } {
  const days = Math.round((Date.parse(`${dueDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (days < 0) return { label: `${-days}d late`, tone: "late" };
  if (days === 0) return { label: "Today", tone: "today" };
  if (days === 1) return { label: "Tomorrow", tone: "soon" };
  const date = new Date(`${dueDate}T00:00:00Z`);
  const sameYear = dueDate.slice(0, 4) === today.slice(0, 4);
  return {
    label: date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
      timeZone: "UTC",
    }),
    tone: "later",
  };
}
