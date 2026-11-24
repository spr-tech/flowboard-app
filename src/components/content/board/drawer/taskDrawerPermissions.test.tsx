import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { BoardTask } from "@/models/responses/boardResponses";
import type { MyBoardMembership, ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { boardMembership, boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { TaskDrawer } from "./taskDrawer";

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/projects/p1",
  useSearchParams: () => nav.params,
}));
vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const alex = { id: "demo", name: "Alex Morgan", image: null };
const sam = { id: "sam", name: "Sam Rivera", image: null };
const notes = [
  { id: "n1", taskId: "a", body: "Tried Safari 17", createdAt: "2026-11-20T10:00:00.000Z", author: sam },
  { id: "n2", taskId: "a", body: "Same on iOS", createdAt: "2026-11-21T10:00:00.000Z", author: alex },
];

/** The drawer for task "a" on a board where I am `me` (meId "sam" unless said otherwise). */
async function openDrawer(task: Partial<BoardTask>, me: Partial<MyBoardMembership>, meId = "sam") {
  const board: ProjectDetail = projectDetail({
    tasks: [boardTask("a", { title: "Fix pay", ...task })],
    me: boardMembership(me),
  });
  nav.params = new URLSearchParams({ task: "a" });
  const fetchMock = mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (request.method !== "GET") return jsonResponse(200, board.tasks[0]);
    if (path.endsWith("/notes")) return jsonResponse(200, notes);
    if (path.endsWith("/activity")) return jsonResponse(200, []);
    return jsonResponse(200, board);
  });
  const view = renderWithStore(<div />);
  await view.store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  view.rerender(<TaskDrawer project={board} meId={meId} />);
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  return { ...view, writes };
}

describe("TaskDrawer: what I may change", () => {
  beforeEach(() => vi.clearAllMocks());

  it("a member's assigned task shows its fields as text with one note; move and notes still work, no Delete", async () => {
    await openDrawer({ assignee: sam, createdById: "demo" }, { role: "MEMBER" });

    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Description")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Priority")).not.toBeInTheDocument();
    expect(screen.getByText("Fix pay")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You can move the task and add notes. Only its creator, the owner or a manager can change the details and the due date."
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Column")).toBeEnabled();
    expect(screen.getByText("Sam Rivera (you)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
    expect(await screen.findByText("Tried Safari 17")).toBeInTheDocument();
  });

  it("a member's own task: title and description editable, the due date as text with the note, Delete shown", async () => {
    await openDrawer(
      { assignee: sam, createdById: "sam", description: "A description long enough" },
      { role: "MEMBER" }
    );

    expect(screen.getByLabelText("Title")).not.toHaveAttribute("readonly");
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "You can edit the details, move the task and add notes. Only the owner or a manager can change the due date."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete task" })).toBeInTheDocument();
  });

  it("someone else's task can't be changed by a member: one note, the column as text", async () => {
    await openDrawer({ assignee: alex }, { role: "MEMBER" });
    expect(screen.queryByLabelText("Column")).not.toBeInTheDocument();
    expect(
      screen.getByText("You can view this task and add notes. Only its creator, the owner or a manager can change it.")
    ).toBeInTheDocument();
  });

  it("an unassigned task offers a member Assign to me, disabled with the reason at the limit", async () => {
    const { writes, unmount } = await openDrawer({}, { role: "MEMBER", takenOpenCount: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Assign to me" }));
    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/a/take");
    unmount();

    await openDrawer({}, { role: "MEMBER", takenOpenCount: 5 });
    expect(screen.getByRole("button", { name: "Assign to me" })).toBeDisabled();
    expect(
      screen.getByText("You've taken 5 open tasks. Finish one first, or ask the owner to assign more.")
    ).toBeInTheDocument();
  });

  it("the picker lists everyone for the owner and managers with createAndAssign, and no one else", async () => {
    const owner = await openDrawer({}, { role: "OWNER" }, "demo");
    const picker = screen.getByLabelText("Assignee");
    expect(
      within(picker)
        .getAllByRole("option")
        .map((option) => option.textContent)
    ).toEqual(["Unassigned", "Alex Morgan (you)", "Sam Rivera"]);
    owner.unmount();

    const manager = await openDrawer({}, { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS });
    expect(screen.getByLabelText("Assignee").tagName).toBe("SELECT");
    manager.unmount();

    await openDrawer({}, { role: "MANAGER", permissions: { ...DEFAULT_MANAGER_PERMISSIONS, createAndAssign: false } });
    expect(screen.queryByLabelText("Assignee")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Assign to me" })).toBeInTheDocument();
  });

  it("the owner opening a member's new task clears the New badge", async () => {
    const { writes } = await openDrawer({ newForOwner: true, createdById: "sam" }, { role: "OWNER" }, "demo");
    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/a/seen");
  });

  it("notes: anyone adds one; delete shows on my own notes only, and on every note for the owner", async () => {
    const member = await openDrawer({ assignee: sam }, { role: "MEMBER" });
    await screen.findByText("Same on iOS");
    expect(screen.getByRole("button", { name: "Delete note from Sam Rivera" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete note from Alex Morgan" })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Add a note"), "Works on Chrome");
    await userEvent.click(screen.getByRole("button", { name: "Add note" }));
    await vi.waitFor(() => expect(member.writes()).toHaveLength(1));
    expect(await member.writes()[0].json()).toEqual({ body: "Works on Chrome" });
    member.unmount();

    await openDrawer({ assignee: sam }, { role: "OWNER" }, "demo");
    await screen.findByText("Same on iOS");
    expect(screen.getAllByRole("button", { name: /^Delete note from/ })).toHaveLength(2);
  });
});
