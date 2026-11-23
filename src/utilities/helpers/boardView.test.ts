import { describe, expect, it } from "vitest";

import type { BoardTask } from "@/models/responses/boardResponses";
import { columnTasks, dropNeighbours, dueChip, orderedColumn, reorderedColumn, type BoardFilters } from "./boardView";

const task = (id: string, overrides: Partial<BoardTask> = {}): BoardTask => ({
  id,
  columnId: "todo",
  title: id,
  description: null,
  priority: "MEDIUM",
  position: 1000,
  dueDate: null,
  assignee: null,
  completedAt: null,
  createdAt: "2026-11-01T00:00:00.000Z",
  createdById: "me",
  takenFromPool: false,
  newForOwner: false,
  ...overrides,
});

const none: BoardFilters = { priority: "all", onlyMine: false, meId: "me", hiddenIds: [] };
const ids = (tasks: BoardTask[]) => tasks.map((t) => t.id);

describe("columnTasks", () => {
  const tasks = [
    task("b", { position: 2000, priority: "HIGH", assignee: { id: "me", name: "Me", image: null } }),
    task("a", { position: 1000 }),
    task("c", { position: 1500, priority: "HIGH" }),
    task("other", { columnId: "done" }),
  ];

  it("lists the column's own tasks by position", () => {
    expect(ids(columnTasks(tasks, "todo", none))).toEqual(["a", "c", "b"]);
  });

  it("applies the priority filter and only my tasks", () => {
    expect(ids(columnTasks(tasks, "todo", { ...none, priority: "HIGH" }))).toEqual(["c", "b"]);
    expect(ids(columnTasks(tasks, "todo", { ...none, onlyMine: true }))).toEqual(["b"]);
    expect(ids(columnTasks(tasks, "todo", { ...none, onlyMine: true, meId: null }))).toEqual([]);
  });

  it("hides tasks waiting out their Undo window", () => {
    expect(ids(columnTasks(tasks, "todo", { ...none, hiddenIds: ["c"] }))).toEqual(["a", "b"]);
  });
});

describe("dropNeighbours", () => {
  const others = [{ id: "a" }, { id: "b" }];

  it("names the cards above and below the drop", () => {
    expect(dropNeighbours(others, 1)).toEqual({ afterTaskId: "a", beforeTaskId: "b" });
  });

  it("has only a card below at the top, only above at the bottom, and none in an empty column", () => {
    expect(dropNeighbours(others, 0)).toEqual({ beforeTaskId: "a" });
    expect(dropNeighbours(others, 2)).toEqual({ afterTaskId: "b" });
    expect(dropNeighbours([], 0)).toEqual({});
  });
});

describe("dueChip", () => {
  const today = "2026-11-22";

  it.each([
    ["2026-11-19", "3d late", "late"],
    ["2026-11-22", "Today", "today"],
    ["2026-11-23", "Tomorrow", "soon"],
    ["2026-11-30", "30 Nov", "later"],
    ["2027-01-04", "4 Jan 2027", "later"],
  ])("%s reads %s", (due, label, tone) => {
    expect(dueChip(due, today)).toEqual({ label, tone });
  });
});

describe("my own card order", () => {
  const tasks = [task("a", { position: 1000 }), task("b", { position: 2000 }), task("c", { position: 3000 })];

  it("shows my order, with a new card at its team position, and filters after ordering", () => {
    const withNew = [...tasks, task("n", { position: 1500 })];
    expect(ids(orderedColumn(withNew, "todo", { todo: ["c", "a", "b"] }))).toEqual(["c", "a", "n", "b"]);
    expect(
      ids(columnTasks(withNew, "todo", { ...none, cardOrder: { todo: ["c", "a", "b"] }, hiddenIds: ["a"] }))
    ).toEqual(["c", "n", "b"]);
  });

  it("reorders the whole column for a drop on a card, or at the bottom", () => {
    expect(reorderedColumn(tasks, "todo", null, "c", "a")).toEqual(["c", "a", "b"]);
    expect(reorderedColumn(tasks, "todo", { todo: ["c", "a", "b"] }, "c", null)).toEqual(["a", "b", "c"]);
    expect(reorderedColumn(tasks, "todo", null, "a", "a")).toEqual(["a", "b", "c"]);
  });
});
