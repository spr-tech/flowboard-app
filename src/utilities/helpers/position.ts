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
