// Which board columns are folded on a phone, remembered per project on this device.
// Only the columns someone has toggled are stored ({ columnId: collapsed }); every other column
// follows the default: the done column folded, the rest open. So when another column becomes the
// done column, the default follows it. Storage can be full, blocked or hold anything, so every
// read and write is guarded and falls back to the defaults.

export type CollapsedColumns = Record<string, boolean>;

export const collapsedColumnsKey = (projectId: string) => `flowboard:collapsedColumns:${projectId}`;

/** Folded or not: what the person chose, otherwise folded only for the done column. */
export const isColumnCollapsed = (column: { id: string; isDone: boolean }, saved: CollapsedColumns) =>
  saved[column.id] ?? column.isDone;

export function readCollapsedColumns(projectId: string): CollapsedColumns {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(collapsedColumnsKey(projectId)) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean")
    );
  } catch {
    return {};
  }
}

/** Saves the choices for columns that still exist; ones deleted since are dropped. */
export function writeCollapsedColumns(projectId: string, saved: CollapsedColumns, columnIds: string[]) {
  const kept = Object.fromEntries(Object.entries(saved).filter(([id]) => columnIds.includes(id)));
  try {
    window.localStorage.setItem(collapsedColumnsKey(projectId), JSON.stringify(kept));
  } catch {
    // Storage full or blocked: the fold still works until the page is left.
  }
  return kept;
}
