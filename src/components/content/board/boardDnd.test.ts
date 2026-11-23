import { describe, expect, it } from "vitest";

import { boardTask, projectDetail } from "@/test/projectFixtures";
import type { BoardFilters } from "@/utilities/helpers/boardView";
import { dropNeighbours } from "@/utilities/helpers/boardView";
import { boardAnnouncements, collisionByKind, resolveDrop } from "./boardDnd";

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
  const kind = over.id.startsWith("area:") ? ("cardArea" as const) : ("card" as const);
  const { others, index } = resolveDrop(project, filters, activeId, { ...over, kind });
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
    expect(neighboursFor("x", { id: "area:todo", columnId: "todo" })).toEqual({ afterTaskId: "c" });
    expect(neighboursFor("a", { id: "area:done", columnId: "done" })).toEqual({});
  });

  it("dropping on a folded column's header (phones) goes to the bottom of that column", () => {
    const { others, index } = resolveDrop(project, filters, "x", {
      id: "header:todo",
      columnId: "todo",
      kind: "columnHeader",
    });
    expect(dropNeighbours(others, index)).toEqual({ afterTaskId: "c" });
  });

  it("reports when a card is dropped back where it was", () => {
    const drop = resolveDrop(project, filters, "b", { id: "b", columnId: "todo", kind: "card" });
    expect(drop.index).toBe(drop.fromIndex);
  });
});

describe("collisionByKind", () => {
  /** A drop target of a kind, at x (each 100px wide). */
  const target = (id: string, kind: string, x: number) => ({
    id,
    key: id,
    data: { current: { kind } },
    disabled: false,
    node: { current: null },
    rect: { current: { top: 0, left: x, width: 100, height: 100, bottom: 100, right: x + 100 } },
  });
  const rectAt = (x: number) => ({ top: 0, left: x, width: 100, height: 100, bottom: 100, right: x + 100 });
  const containers = [
    target("column:a", "column", 0),
    target("card1", "card", 10),
    target("area:a", "cardArea", 20),
    target("header:b", "columnHeader", 30),
  ];
  const collide = (kind: string) =>
    collisionByKind({
      active: { id: "x", data: { current: { kind } }, rect: { current: { initial: null, translated: null } } },
      collisionRect: rectAt(15),
      droppableRects: new Map(containers.map((c) => [c.id, c.rect.current])),
      droppableContainers: containers,
      pointerCoordinates: null,
    } as never).map((collision) => collision.id);

  it("lets a column land only on columns", () => {
    expect(collide("column")).toEqual(["column:a"]);
  });

  it("lets a card land only on cards, card areas and folded column headers", () => {
    expect(collide("card").sort()).toEqual(["area:a", "card1", "header:b"]);
  });
});

describe("boardAnnouncements", () => {
  const picked = (isPhone: boolean) =>
    boardAnnouncements(projectDetail(), true, isPhone).onDragStart({
      active: { id: "column:done", data: { current: { kind: "column", columnId: "done" } } },
    } as never);

  it("tells a phone user to move columns up and down, and a desktop user left and right", () => {
    expect(picked(true)).toContain("Use the up and down arrow keys");
    expect(picked(false)).toContain("Use the left and right arrow keys");
  });
});
