import { describe, expect, it } from "vitest";

import { boardTask } from "@/test/projectFixtures";
import type { BoardFilters } from "@/utilities/helpers/boardView";
import { dropNeighbours } from "@/utilities/helpers/boardView";
import { resolveDrop } from "./boardColumns";

const filters: BoardFilters = { priority: "all", onlyMine: false, meId: null, hiddenIds: [] };
const project = {
  tasks: [
    boardTask("a", { position: 1000 }),
    boardTask("b", { position: 2000 }),
    boardTask("c", { position: 3000 }),
    boardTask("x", { columnId: "doing", position: 1000 }),
  ],
};

/** Where the server is told the card goes. */
const neighboursFor = (activeId: string, over: { id: string; columnId: string }) => {
  const { others, index } = resolveDrop(project, filters, activeId, over);
  return dropNeighbours(others, index);
};

describe("resolveDrop", () => {
  it("moving down within a column takes the hovered card's place (lands below it)", () => {
    expect(neighboursFor("a", { id: "c", columnId: "todo" })).toEqual({ afterTaskId: "c" });
    expect(neighboursFor("a", { id: "b", columnId: "todo" })).toEqual({ afterTaskId: "b", beforeTaskId: "c" });
  });

  it("moving up within a column lands above the hovered card", () => {
    expect(neighboursFor("c", { id: "a", columnId: "todo" })).toEqual({ beforeTaskId: "a" });
  });

  it("dropping on another column's card lands just above it", () => {
    expect(neighboursFor("x", { id: "b", columnId: "todo" })).toEqual({ afterTaskId: "a", beforeTaskId: "b" });
  });

  it("dropping on a column's empty space goes to the bottom, or alone into an empty column", () => {
    expect(neighboursFor("x", { id: "column:todo", columnId: "todo" })).toEqual({ afterTaskId: "c" });
    expect(neighboursFor("a", { id: "column:done", columnId: "done" })).toEqual({});
  });

  it("reports when a card is dropped back where it was", () => {
    const drop = resolveDrop(project, filters, "b", { id: "b", columnId: "todo" });
    expect(drop.index).toBe(drop.fromIndex);
  });
});
