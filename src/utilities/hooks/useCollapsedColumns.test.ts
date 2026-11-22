import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { collapsedColumnsKey } from "@/utilities/helpers/collapsedColumns";
import { useCollapsedColumns } from "./useCollapsedColumns";

const columns = [
  { id: "todo", isDone: false },
  { id: "done", isDone: true },
];

afterEach(() => window.localStorage.clear());

describe("useCollapsedColumns", () => {
  it("starts with only the done column folded", () => {
    const { result } = renderHook(() => useCollapsedColumns("p1", columns));

    expect(result.current.isCollapsed(columns[0])).toBe(false);
    expect(result.current.isCollapsed(columns[1])).toBe(true);
  });

  it("toggles a column and remembers it for the next visit", () => {
    const { result, unmount } = renderHook(() => useCollapsedColumns("p1", columns));

    act(() => result.current.toggle("done"));
    act(() => result.current.toggle("todo"));
    expect(result.current.isCollapsed(columns[1])).toBe(false);
    expect(result.current.isCollapsed(columns[0])).toBe(true);
    unmount();

    const again = renderHook(() => useCollapsedColumns("p1", columns));
    expect(again.result.current.isCollapsed(columns[1])).toBe(false);
    expect(again.result.current.isCollapsed(columns[0])).toBe(true);
  });

  it("reads the other project's choices when the board changes", () => {
    window.localStorage.setItem(collapsedColumnsKey("p2"), JSON.stringify({ todo: true }));
    const { result, rerender } = renderHook(({ projectId }) => useCollapsedColumns(projectId, columns), {
      initialProps: { projectId: "p1" },
    });
    expect(result.current.isCollapsed(columns[0])).toBe(false);

    rerender({ projectId: "p2" });

    expect(result.current.isCollapsed(columns[0])).toBe(true);
  });
});
