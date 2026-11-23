// The columns as I see them (docs/plan/03-data-model.md, "Column order"). The team order is
// Column.position; a member may keep their own order, a list of column ids.

/**
 * My columns, left to right. With no personal order: the team order. With one: my order, where
 * ids of deleted columns are ignored, and a column missing from it (added after I set my order)
 * goes right after the column that precedes it in the team order (or first, if none does).
 */
export function orderColumns<T extends { id: string }>(
  teamOrder: readonly T[],
  personal: readonly string[] | null
): T[] {
  if (!personal) return [...teamOrder];
  const byId = new Map(teamOrder.map((column) => [column.id, column]));
  const ordered = personal.flatMap((id) => {
    const column = byId.get(id);
    return column ? [column] : [];
  });
  const placed = new Set(ordered.map((column) => column.id));

  teamOrder.forEach((column, teamIndex) => {
    if (placed.has(column.id)) return;
    // The nearest column to its left in the team order that I can already see.
    const before = teamOrder
      .slice(0, teamIndex)
      .reverse()
      .find((candidate) => placed.has(candidate.id));
    const at = before ? ordered.findIndex((candidate) => candidate.id === before.id) + 1 : 0;
    ordered.splice(at, 0, column);
    placed.add(column.id);
  });
  return ordered;
}

/** Moves one id to a new index (both in the shown order), returning the new list of ids. */
export function moveId(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
