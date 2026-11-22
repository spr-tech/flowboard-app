"use client";

// The phone board's folded columns for one project (see helpers/collapsedColumns.ts).
import { useState } from "react";

import {
  isColumnCollapsed,
  readCollapsedColumns,
  writeCollapsedColumns,
  type CollapsedColumns,
} from "@/utilities/helpers/collapsedColumns";

type Column = { id: string; isDone: boolean };

export function useCollapsedColumns(projectId: string, columns: Column[]) {
  // Read once per project. The board only renders in the browser (its data loads there), so
  // reading storage while rendering can't disagree with a server render.
  const [state, setState] = useState(() => ({ projectId, saved: readCollapsedColumns(projectId) }));
  let saved: CollapsedColumns = state.saved;
  if (state.projectId !== projectId) {
    saved = readCollapsedColumns(projectId);
    setState({ projectId, saved });
  }

  const isCollapsed = (column: Column) => isColumnCollapsed(column, saved);

  const toggle = (columnId: string) => {
    const column = columns.find((item) => item.id === columnId);
    if (!column) return;
    const next = { ...saved, [columnId]: !isColumnCollapsed(column, saved) };
    const kept = writeCollapsedColumns(
      projectId,
      next,
      columns.map((item) => item.id)
    );
    setState({ projectId, saved: kept });
  };

  return { isCollapsed, toggle };
}
