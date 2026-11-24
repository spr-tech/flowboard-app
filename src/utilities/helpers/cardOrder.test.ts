import { describe, expect, it } from "vitest";

import { orderCards, toCardOrder, withCardPlaced } from "./cardOrder";

const cards = (...ids: string[]) => ids.map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((item) => item.id);

describe("toCardOrder", () => {
  it("keeps well-formed columns and drops the rest", () => {
    expect(toCardOrder({ a: ["1", "2"], b: "x", c: [1] })).toEqual({ a: ["1", "2"] });
    expect(toCardOrder(null)).toBeNull();
    expect(toCardOrder(["a"])).toBeNull();
    expect(toCardOrder({})).toBeNull();
  });
});

describe("orderCards", () => {
  it("follows the team order with no personal order", () => {
    expect(ids(orderCards(cards("a", "b", "c"), undefined))).toEqual(["a", "b", "c"]);
  });

  it("uses my order, ignoring cards that left the column", () => {
    expect(ids(orderCards(cards("a", "b", "c"), ["c", "gone", "a", "b"]))).toEqual(["c", "a", "b"]);
  });

  it("puts a new card in at its team position: after the card before it in the team order", () => {
    // Team: a, new, b, c. Mine: c, a, b. "new" follows a.
    expect(ids(orderCards(cards("a", "new", "b", "c"), ["c", "a", "b"]))).toEqual(["c", "a", "new", "b"]);
    // A new card at the top of the team order goes first.
    expect(ids(orderCards(cards("new", "a", "b"), ["b", "a"]))).toEqual(["new", "b", "a"]);
  });
});

describe("withCardPlaced", () => {
  it("writes the target column in full and drops the card from the source column", () => {
    expect(
      withCardPlaced({ todo: ["t", "x"], done: ["z"] }, ["a", "b"], {
        taskId: "t",
        index: 1,
        toColumnId: "doing",
        fromColumnId: "todo",
      })
    ).toEqual({ todo: ["x"], done: ["z"], doing: ["a", "t", "b"] });
  });

  it("reorders within one column, clamping the index", () => {
    expect(
      withCardPlaced(null, ["a", "t", "b"], { taskId: "t", index: 9, toColumnId: "todo", fromColumnId: "todo" })
    ).toEqual({ todo: ["a", "b", "t"] });
  });
});
