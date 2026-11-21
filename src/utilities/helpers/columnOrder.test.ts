import { describe, expect, it } from "vitest";

import { moveId, orderColumns } from "./columnOrder";

const team = ["todo", "doing", "review", "done"].map((id) => ({ id }));
const ids = (columns: { id: string }[]) => columns.map((column) => column.id);

describe("orderColumns", () => {
  it("follows the team order when I have no personal order", () => {
    expect(ids(orderColumns(team, null))).toEqual(["todo", "doing", "review", "done"]);
  });

  it("follows my own order when I have one", () => {
    expect(ids(orderColumns(team, ["review", "todo", "doing", "done"]))).toEqual(["review", "todo", "doing", "done"]);
  });

  it("puts a column added later right after the column that precedes it in the team order", () => {
    // "review" was added after I set my order; in the team order it follows "doing".
    expect(ids(orderColumns(team, ["done", "doing", "todo"]))).toEqual(["done", "doing", "review", "todo"]);
  });

  it("puts a new first column first, when nothing precedes it", () => {
    const withNewFirst = [{ id: "ideas" }, ...team];
    expect(ids(orderColumns(withNewFirst, ["done", "review", "doing", "todo"]))).toEqual([
      "ideas",
      "done",
      "review",
      "doing",
      "todo",
    ]);
  });

  it("ignores ids of deleted columns", () => {
    expect(ids(orderColumns(team, ["gone", "review", "todo", "doing", "done"]))).toEqual([
      "review",
      "todo",
      "doing",
      "done",
    ]);
  });

  it("handles several missing columns in a row", () => {
    expect(ids(orderColumns(team, ["done"]))).toEqual(["todo", "doing", "review", "done"]);
  });
});

describe("moveId", () => {
  it("moves an id left or right", () => {
    expect(moveId(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveId(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
  });
});
