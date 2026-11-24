// A member's own card order (docs/plan/03-data-model.md, "Card order"). The team order is
// Task.position; a member may keep their own top-to-bottom order per column, stored as
// { [columnId]: taskId[] }. Pure, shared by the board and the server.
import type { CardOrder } from "@/models/responses/boardResponses";
import { orderColumns } from "./columnOrder";

/** A stored card order, keeping only well-formed columns; null when there is none. */
export function toCardOrder(value: unknown): CardOrder | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((id) => typeof id === "string")
  );
  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

/**
 * One column's cards as I see them. With no personal order for it: the team order. With one: my
 * order, where ids of tasks that left the column are ignored, and a card missing from it (new, or
 * moved in by someone else) goes in at its team position: right after the card that precedes it
 * in the team order (or first, if none does). The same rule as columns.
 */
export function orderCards<T extends { id: string }>(
  teamOrder: readonly T[],
  personal: readonly string[] | null | undefined
) {
  return orderColumns(teamOrder, personal ?? null);
}

/**
 * My card order after I drop `taskId` at `index` among the other cards of `toColumnId` (in my
 * order), coming from `fromColumnId`. The target column's list is written out in full; the task
 * is dropped from the source column's list.
 */
export function withCardPlaced(
  order: CardOrder | null,
  othersInMyOrder: readonly string[],
  move: { taskId: string; index: number; toColumnId: string; fromColumnId: string }
): CardOrder {
  const next: CardOrder = { ...(order ?? {}) };
  if (move.fromColumnId !== move.toColumnId && next[move.fromColumnId]) {
    next[move.fromColumnId] = next[move.fromColumnId].filter((id) => id !== move.taskId);
  }
  const list = othersInMyOrder.filter((id) => id !== move.taskId);
  list.splice(Math.max(0, Math.min(move.index, list.length)), 0, move.taskId);
  next[move.toColumnId] = list;
  return next;
}
