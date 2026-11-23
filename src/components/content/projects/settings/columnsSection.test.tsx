import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { boardColumn, boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
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

const owner = (permissions: Partial<ProjectDetail["columnPermissions"]> = {}) =>
  projectDetail({
    columns,
    columnPermissions: { membersCanAddColumns: false, memberColumnLimit: 3, memberColumnCount: 1, ...permissions },
  });
const member = (permissions: Partial<ProjectDetail["columnPermissions"]> = {}) =>
  projectDetail({ ...owner(permissions), me: boardMembership({ role: "MEMBER" }) });

describe("ColumnsSection", () => {
  beforeEach(() => vi.mocked(toast).mockClear());

  it("lists the columns in the team order, each with who added it", async () => {
    await renderSection(owner(), "demo");

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getByText("2 tasks · Added by Alex Morgan · 1 Nov 2026")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Added by Sam Rivera/)).toBeInTheDocument();
    expect(within(rows[2]).getByText("Done column")).toBeInTheDocument();
  });

  it("the owner's switch saves on change with a toast", async () => {
    const { writes } = await renderSection(owner(), "demo");

    await userEvent.click(screen.getByRole("switch", { name: "Members can add columns" }));

    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(await writes()[0].json()).toEqual({ membersCanAddColumns: true });
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "Column settings saved" });
  });

  it("shows the count alone when the limit was lowered below it", async () => {
    await renderSection(owner({ membersCanAddColumns: true, memberColumnLimit: 2, memberColumnCount: 4 }), "demo");
    expect(screen.getByText("· 4 used, over the limit")).toBeInTheDocument();
    expect(screen.queryByText(/4 of 2/)).not.toBeInTheDocument();
  });

  it("with the switch on, the limit field shows the usage and saves after a pause", async () => {
    const { writes } = await renderSection(owner({ membersCanAddColumns: true }), "demo");
    expect(screen.getByText("· 1 of 3 used")).toBeInTheDocument();

    const limit = screen.getByRole("spinbutton", { name: "Up to" });
    await userEvent.clear(limit);
    await userEvent.type(limit, "5");

    await vi.waitFor(() => expect(writes()).toHaveLength(1), { timeout: 1500 });
    expect(await writes()[0].json()).toEqual({ memberColumnLimit: 5 });
  });

  it("refuses a limit outside 1 to 10 without saving", async () => {
    const { writes } = await renderSection(owner({ membersCanAddColumns: true }), "demo");

    const limit = screen.getByRole("spinbutton", { name: "Up to" });
    await userEvent.clear(limit);
    await userEvent.type(limit, "11");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a number from 1 to 10");
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(writes()).toHaveLength(0);
  });

  it("members see the setting as text, whichever way it is", async () => {
    const { unmount } = await renderSection(member({ membersCanAddColumns: true }), "sam");
    expect(screen.getByText("Members can add up to 3 columns · 1 used")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    unmount();

    await renderSection(member(), "sam");
    expect(screen.getByText("Only the owner can add columns")).toBeInTheDocument();
  });

  it("a member can rename only the column they added, and has no move, done or delete controls", async () => {
    await renderSection(member(), "sam");

    expect(screen.getByRole("textbox", { name: "Name of column 2" })).toHaveValue("Review");
    expect(screen.queryByRole("textbox", { name: "Name of column 1" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move .* left/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set as done" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
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
