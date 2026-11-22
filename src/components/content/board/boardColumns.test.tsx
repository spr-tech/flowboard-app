import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { DESKTOP_WIDTH, PHONE_WIDTH, stubScreenWidth } from "@/test/matchMedia";
import { boardMembership, boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import type { BoardFilters } from "@/utilities/helpers/boardView";
import { collapsedColumnsKey } from "@/utilities/helpers/collapsedColumns";
import { BoardColumns } from "./boardColumns";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const filters: BoardFilters = { priority: "all", onlyMine: false, meId: "demo", hiddenIds: [] };
const COLUMN_WIDTH = 320;

/**
 * jsdom lays nothing out, so dnd-kit's keyboard sensor would find nothing to move to. Give each
 * column (and everything inside it) a box by its place in the row, 320px apart.
 */
function layOutColumnsInARow() {
  const box = (left: number, width: number) => ({
    x: left,
    y: 0,
    left,
    top: 0,
    width,
    height: 400,
    right: left + width,
    bottom: 400,
    toJSON: () => ({}),
  });
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const sections = Array.from(document.querySelectorAll("section[aria-label]"));
    // The scrolling row holds every column: it spans them all.
    if (this.contains(sections[0] ?? null) && !this.matches("section")) return box(0, sections.length * COLUMN_WIDTH);
    // A column and everything inside it; the drag overlay (outside the columns) starts where the
    // dragged column, the one holding focus, is.
    const section = this.closest("section[aria-label]") ?? document.activeElement?.closest("section[aria-label]");
    return box(section ? sections.indexOf(section) * COLUMN_WIDTH : 0, 300);
  });
}

async function renderColumns(project: ProjectDetail, answer: () => Response) {
  const fetchMock = mockFetch((request) => (request.method === "GET" ? jsonResponse(200, project) : answer()));
  const view = renderWithStore(<div />);
  await view.store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  // The component reads the board from the cache, like the page does.
  const Live = () => {
    const board = projectsService.endpoints.getProject.useQueryState("p1").data ?? project;
    return <BoardColumns project={board} filters={filters} meId="demo" today="2026-11-22" onOpenTask={vi.fn()} />;
  };
  view.rerender(<Live />);
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  const shownOrder = () => screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
  return { ...view, writes, shownOrder };
}

/** Focus a column's grip handle, then Space, ArrowLeft, Space: the keyboard drag. */
async function keyboardMoveLeft(columnName: string) {
  const handle = screen.getByRole("button", { name: `Move column ${columnName}` });
  act(() => handle.focus());
  for (const code of ["Space", "ArrowLeft", "Space"]) {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? handle, { code, key: code === "Space" ? " " : code });
      // dnd-kit measures the drop targets on the next animation frame after a key; wait for it,
      // as a person pressing keys would.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
}

describe("BoardColumns: moving columns", () => {
  let layout: ReturnType<typeof layOutColumnsInARow>;
  beforeEach(() => {
    layout = layOutColumnsInARow();
  });
  afterEach(() => layout.mockRestore());

  it("the owner's keyboard move changes the team order, with the new neighbours", async () => {
    const { writes, shownOrder } = await renderColumns(projectDetail(), () =>
      jsonResponse(200, { id: "done", position: 1500 })
    );

    await keyboardMoveLeft("Done");

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/columns/done/move");
    expect(await writes()[0].json()).toEqual({ afterColumnId: "todo", beforeColumnId: "doing" });
    expect(shownOrder()).toEqual(["To do", "Done", "In progress"]);
  });

  it("a member's keyboard move changes only their own view", async () => {
    const memberBoard = projectDetail({ me: boardMembership({ role: "MEMBER" }) });
    const { writes, shownOrder } = await renderColumns(memberBoard, () =>
      jsonResponse(200, { projectId: "p1", columnOrder: ["todo", "done", "doing"] })
    );

    await keyboardMoveLeft("Done");

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/projects/p1/column-order");
    expect(await writes()[0].json()).toEqual({ columnIds: ["todo", "done", "doing"] });
    expect(shownOrder()).toEqual(["To do", "Done", "In progress"]);
  });

  it("puts the owner's column back when the move fails", async () => {
    const { writes, shownOrder } = await renderColumns(projectDetail(), () =>
      jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } })
    );

    await keyboardMoveLeft("Done");

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    await vi.waitFor(() => expect(shownOrder()).toEqual(["To do", "In progress", "Done"]));
  });
});

/**
 * The phone layout as jsdom can't draw it: columns 500px apart down the page, each with its header
 * on top (36px) and its cards and card area below it.
 */
function layOutColumnsInAStack() {
  const box = (top: number, height: number) => ({
    x: 0,
    y: top,
    left: 0,
    top,
    width: 358,
    height,
    right: 358,
    bottom: top + height,
    toJSON: () => ({}),
  });
  return vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    const sections = Array.from(document.querySelectorAll("section[aria-label]"));
    if (this.contains(sections[0] ?? null) && !this.matches("section")) return box(0, sections.length * 500);
    const section = this.closest("section[aria-label]") ?? document.activeElement?.closest("section[aria-label]");
    const top = section ? sections.indexOf(section) * 500 : 0;
    if (this.matches("section")) return box(top, 400);
    if (this.closest("header")) return box(top, 36);
    return box(top + 50, 300);
  });
}

/** Keyboard drag from an element: each key, then a wait for dnd-kit's measuring frame. */
async function pressDragKeys(start: HTMLElement, codes: string[]) {
  act(() => start.focus());
  for (const code of codes) {
    await act(async () => {
      fireEvent.keyDown(document.activeElement ?? start, { code, key: code === "Space" ? " " : code });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  }
}

const toggleFor = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name} ·`) });
const bodyOf = (toggle: HTMLElement) => document.getElementById(toggle.getAttribute("aria-controls") ?? "");

describe("BoardColumns on a phone (under md)", () => {
  let layout: ReturnType<typeof layOutColumnsInAStack>;
  beforeEach(() => {
    stubScreenWidth(PHONE_WIDTH);
    layout = layOutColumnsInAStack();
  });
  afterEach(() => {
    layout.mockRestore();
    vi.unstubAllGlobals();
    window.localStorage.clear();
  });

  const board = () =>
    projectDetail({
      tasks: [
        boardTask("a", { title: "Write copy" }),
        boardTask("d1", { columnId: "done", title: "Old work" }),
        boardTask("d2", { columnId: "done", title: "Older work", position: 2000 }),
      ],
    });

  it("stacks the columns in my order, each header a fold toggle; only the done column starts folded", async () => {
    const memberBoard = { ...board(), me: boardMembership({ role: "MEMBER", columnOrder: ["done", "todo", "doing"] }) };
    const { shownOrder } = await renderColumns(memberBoard, () => jsonResponse(200, {}));

    expect(shownOrder()).toEqual(["Done", "To do", "In progress"]);
    const row = screen.getAllByRole("region")[0].parentElement;
    expect(row).toHaveClass("flex-col", "md:flex-row");
    expect(toggleFor("To do")).toHaveAttribute("aria-expanded", "true");
    expect(toggleFor("In progress")).toHaveAttribute("aria-expanded", "true");
    const done = toggleFor("Done");
    expect(done).toHaveAttribute("aria-expanded", "false");
    expect(done).toHaveTextContent("Done · 2 tasks");
    expect(bodyOf(done)).toHaveAttribute("inert");
    expect(bodyOf(toggleFor("To do"))).not.toHaveAttribute("inert");
    // The grip handle and the menu stay separate buttons.
    expect(screen.getByRole("button", { name: "Move column Done" })).not.toBe(done);
  });

  it("the toggle folds and unfolds, and the choice is remembered for this project", async () => {
    const view = await renderColumns(board(), () => jsonResponse(200, {}));

    fireEvent.click(toggleFor("To do"));
    fireEvent.click(toggleFor("Done"));
    expect(toggleFor("To do")).toHaveAttribute("aria-expanded", "false");
    expect(bodyOf(toggleFor("To do"))).toHaveAttribute("inert");
    expect(toggleFor("Done")).toHaveAttribute("aria-expanded", "true");
    view.unmount();

    await renderColumns(board(), () => jsonResponse(200, {}));
    expect(toggleFor("To do")).toHaveAttribute("aria-expanded", "false");
    expect(toggleFor("Done")).toHaveAttribute("aria-expanded", "true");
  });

  it("ignores remembered columns that no longer exist", async () => {
    window.localStorage.setItem(collapsedColumnsKey("p1"), JSON.stringify({ gone: true, doing: true }));
    await renderColumns(board(), () => jsonResponse(200, {}));

    expect(toggleFor("In progress")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggleFor("In progress"));

    expect(JSON.parse(window.localStorage.getItem(collapsedColumnsKey("p1")) ?? "")).toEqual({ doing: false });
  });

  it("a card dropped on a folded column's header goes to the bottom of that column", async () => {
    const { writes } = await renderColumns(board(), () =>
      jsonResponse(200, { ...boardTask("a"), columnId: "done", position: 3000 })
    );
    const card = screen.getByRole("button", { name: /^Write copy\./ });

    // Down past In progress onto the folded Done header: it lights up as the drop target.
    await pressDragKeys(card, ["Space", "ArrowDown", "ArrowDown"]);
    const doneHeader = toggleFor("Done").closest("header");
    expect(doneHeader).toHaveClass("outline-dashed");
    expect(toggleFor("To do").closest("header")).not.toHaveClass("outline-dashed");
    await pressDragKeys(card, ["Space"]);

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/a/move");
    expect(await writes()[0].json()).toEqual({ columnId: "done", afterTaskId: "d2" });
  });

  it("columns move up and down with the arrow keys", async () => {
    const { writes, shownOrder } = await renderColumns(board(), () =>
      jsonResponse(200, { id: "done", position: 1500 })
    );

    await pressDragKeys(screen.getByRole("button", { name: "Move column Done" }), ["Space", "ArrowUp", "Space"]);

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/columns/done/move");
    expect(shownOrder()).toEqual(["To do", "Done", "In progress"]);
  });
});

describe("BoardColumns from md up", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps every column open and reachable, even one folded on a phone", async () => {
    stubScreenWidth(DESKTOP_WIDTH);
    window.localStorage.setItem(collapsedColumnsKey("p1"), JSON.stringify({ todo: true }));
    await renderColumns(projectDetail(), () => jsonResponse(200, {}));

    for (const name of ["To do", "In progress", "Done"]) {
      const toggle = toggleFor(name);
      // The phone toggle is hidden by CSS from md up; the body is forced open there and never inert.
      expect(toggle).toHaveClass("md:hidden");
      expect(bodyOf(toggle)).toHaveClass("md:grid-rows-[1fr]");
      expect(bodyOf(toggle)).not.toHaveAttribute("inert");
    }
    window.localStorage.clear();
  });
});
