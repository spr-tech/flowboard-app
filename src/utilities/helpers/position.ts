// Positions are spaced floats (docs/plan/03-data-model.md): 1000, 2000, 3000… A moved card takes
// the midpoint of its neighbours, so a move writes one row. When the gap gets too small to split,
// the whole column is re-spaced. Used for tasks within a column and for columns within a project.
// Only the server computes positions; the browser never sends one.

export const POSITION_STEP = 1000;

/** Below this gap between neighbours, a midpoint is no longer safe: re-space first. */
export const MIN_GAP = 0.001;

/**
 * The position for an item placed between `above` and `below` (either may be missing):
 * between two → their midpoint; at the bottom → last + 1000; at the top → first − 1000;
 * into an empty list → 1000.
 */
export function positionBetween(above: number | null, below: number | null): number {
  if (above !== null && below !== null) return (above + below) / 2;
  if (above !== null) return above + POSITION_STEP;
  if (below !== null) return below - POSITION_STEP;
  return POSITION_STEP;
}

/** True when the two neighbours are too close for a midpoint, so the list must be re-spaced first. */
export function needsRespace(above: number | null, below: number | null): boolean {
  return above !== null && below !== null && below - above < MIN_GAP * 2;
}

/** Fresh, evenly spaced positions for `count` items in their current order: 1000, 2000, … */
export function respacedPositions(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index + 1) * POSITION_STEP);
}

/**
 * Where an item lands among `others` (the list without it, in order): the index of the item that
 * will sit directly above it (−1 for the top). `afterId` is the item it lands below, `beforeId`
 * the one it lands above. Given one, the other side is whatever is next to it now; given none, it
 * goes to the bottom. Returns null when a neighbour isn't in the list, or two neighbours aren't
 * next to each other (the list changed under the user).
 */
export function aboveIndexFor(otherIds: readonly string[], afterId?: string, beforeId?: string): number | null {
  const afterIndex = afterId === undefined ? undefined : otherIds.indexOf(afterId);
  const beforeIndex = beforeId === undefined ? undefined : otherIds.indexOf(beforeId);
  if (afterIndex === -1 || beforeIndex === -1) return null;

  let aboveIndex: number;
  if (afterIndex !== undefined) aboveIndex = afterIndex;
  else if (beforeIndex !== undefined) aboveIndex = beforeIndex - 1;
  else aboveIndex = otherIds.length - 1;
  if (beforeIndex !== undefined && beforeIndex !== aboveIndex + 1) return null;
  return aboveIndex;
}

/**
 * The position for an item placed at `aboveIndex + 1` among items with these positions. When the
 * gap is too small, returns fresh positions for the whole list too, to be written first.
 */
export function placeAt(
  positions: readonly number[],
  aboveIndex: number
): { position: number; respaced: number[] | null } {
  const at = (list: readonly number[], index: number) => (index >= 0 && index < list.length ? list[index] : null);
  const respaced = needsRespace(at(positions, aboveIndex), at(positions, aboveIndex + 1))
    ? respacedPositions(positions.length)
    : null;
  const list = respaced ?? positions;
  return { position: positionBetween(at(list, aboveIndex), at(list, aboveIndex + 1)), respaced };
}
