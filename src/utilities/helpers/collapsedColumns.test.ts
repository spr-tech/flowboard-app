import { afterEach, describe, expect, it, vi } from "vitest";

import {
  collapsedColumnsKey,
  isColumnCollapsed,
  readCollapsedColumns,
  writeCollapsedColumns,
} from "./collapsedColumns";

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("isColumnCollapsed", () => {
  it("folds only the done column by default", () => {
    expect(isColumnCollapsed({ id: "done", isDone: true }, {})).toBe(true);
    expect(isColumnCollapsed({ id: "todo", isDone: false }, {})).toBe(false);
  });

  it("follows the person's choice over the default, either way", () => {
    expect(isColumnCollapsed({ id: "done", isDone: true }, { done: false })).toBe(false);
    expect(isColumnCollapsed({ id: "todo", isDone: false }, { todo: true })).toBe(true);
  });
});

describe("readCollapsedColumns / writeCollapsedColumns", () => {
  it("keeps each project's choices apart", () => {
    writeCollapsedColumns("p1", { todo: true }, ["todo"]);
    writeCollapsedColumns("p2", { todo: false }, ["todo"]);

    expect(readCollapsedColumns("p1")).toEqual({ todo: true });
    expect(readCollapsedColumns("p2")).toEqual({ todo: false });
  });

  it("drops columns that no longer exist when saving", () => {
    const kept = writeCollapsedColumns("p1", { todo: true, deleted: true }, ["todo", "done"]);

    expect(kept).toEqual({ todo: true });
    expect(JSON.parse(window.localStorage.getItem(collapsedColumnsKey("p1")) ?? "")).toEqual({ todo: true });
  });

  it("starts empty with nothing saved, broken JSON, or the wrong shape", () => {
    expect(readCollapsedColumns("p1")).toEqual({});

    window.localStorage.setItem(collapsedColumnsKey("p1"), "{not json");
    expect(readCollapsedColumns("p1")).toEqual({});

    window.localStorage.setItem(collapsedColumnsKey("p1"), JSON.stringify(["todo"]));
    expect(readCollapsedColumns("p1")).toEqual({});

    window.localStorage.setItem(collapsedColumnsKey("p1"), JSON.stringify({ todo: "yes", done: false }));
    expect(readCollapsedColumns("p1")).toEqual({ done: false });
  });

  it("carries on when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    expect(readCollapsedColumns("p1")).toEqual({});
    expect(writeCollapsedColumns("p1", { todo: true }, ["todo"])).toEqual({ todo: true });
  });
});
