import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { boardColumn, boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { ColumnsSection } from "./columnsSection";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const columns = [
  boardColumn("todo", "To do", 1000, { taskCount: 2 }),
  boardColumn("review", "Review", 1500, { createdBy: { id: "sam", name: "Sam Rivera" } }),
  boardColumn("done", "Done", 3000, { isDone: true }),
];

async function renderSection(project: ProjectDetail, meId: string) {
  const fetchMock = mockFetch((request) =>
    request.method === "GET" ? jsonResponse(200, project) : jsonResponse(200, project)
  );
  const view = renderWithStore(<div />);
  await view.store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  view.rerender(<ColumnsSection project={project} meId={meId} />);
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  return { ...view, writes };
}

const owner = () => projectDetail({ columns });
const member = () => projectDetail({ columns, me: boardMembership({ role: "MEMBER" }) });
const manager = (switches: Partial<typeof DEFAULT_MANAGER_PERMISSIONS> = {}) =>
  projectDetail({
    columns,
    me: boardMembership({ role: "MANAGER", permissions: { ...DEFAULT_MANAGER_PERMISSIONS, ...switches } }),
  });

describe("ColumnsSection", () => {
  it("lists the columns in the team order, each with who added it", async () => {
    await renderSection(owner(), "demo");

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("2 tasks · Added by Alex Morgan · 1 Nov 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Added by Sam Rivera/)).toBeInTheDocument();
    expect(within(rows[2]).getByText("Done column")).toBeInTheDocument();
  });

  it("members see the columns read-only, even ones they added earlier, with a line saying who manages them", async () => {
    await renderSection(member(), "sam");

    expect(screen.getByText(/Team columns are managed by the owner and managers/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add column" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move .* left/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set as done" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("a manager with manageColumns renames, moves and adds, but can't set done or delete", async () => {
    await renderSection(manager(), "kim");

    expect(screen.getByRole("textbox", { name: "Name of column 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move Review left" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add column" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set as done" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("a manager with deleteColumns deletes, but never the done column", async () => {
    await renderSection(manager({ manageColumns: false, deleteColumns: true }), "kim");

    expect(screen.getByRole("button", { name: "Delete To do" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Done" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("move left and right change the team order through the move endpoint", async () => {
    const { writes } = await renderSection(owner(), "demo");

    expect(screen.getByRole("button", { name: "Move To do left" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Move Review left" }));
    await userEvent.click(screen.getByRole("button", { name: "Move Review right" }));

    await vi.waitFor(() => expect(writes()).toHaveLength(2));
    expect(new URL(writes()[0].url).pathname).toBe("/api/columns/review/move");
    expect(await writes()[0].json()).toEqual({ beforeColumnId: "todo" });
    expect(await writes()[1].json()).toEqual({ afterColumnId: "done" });
  });

  it("renames on Enter, and delete from settings only offers moving the tasks", async () => {
    const { writes } = await renderSection(owner(), "demo");

    const name = screen.getByRole("textbox", { name: "Name of column 2" });
    await userEvent.clear(name);
    await userEvent.type(name, "QA{Enter}");
    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(await writes()[0].json()).toEqual({ name: "QA" });

    await userEvent.click(screen.getByRole("button", { name: "Delete To do" }));
    expect(await screen.findByRole("dialog", { name: "Delete “To do”?" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Delete the column and its/ })).not.toBeInTheDocument();
  });
});
