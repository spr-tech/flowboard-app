import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import type { BoardFilters } from "@/utilities/helpers/boardView";
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
