import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectsService } from "@/services/projectsService";
import { taskDeletePending } from "@/stores/uiSlice";
import { boardMembership, boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import BoardContent from "./boardContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const me = {
  id: "demo",
  name: "Alex Morgan",
  email: "demo@example.com",
  image: null,
  hasPassword: true,
  emailVerified: true,
};

function boardWith(overrides: Partial<ProjectDetail> = {}) {
  return projectDetail({
    tasks: [
      boardTask("a", { title: "Fix login", priority: "HIGH", assignee: { id: "demo", name: "Alex", image: null } }),
      boardTask("b", { title: "Write copy", position: 2000, priority: "LOW" }),
      boardTask("c", { title: "Ship it", columnId: "done", completedAt: "2026-11-20T00:00:00.000Z" }),
    ],
    ...overrides,
  });
}

function renderBoard(board: ProjectDetail = boardWith(), onWrite?: (request: Request) => Response) {
  const fetchMock = mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/me") return jsonResponse(200, me);
    if (request.method === "GET" && path === "/api/projects/p1") return jsonResponse(200, board);
    return onWrite?.(request) ?? jsonResponse(500, {});
  });
  return { ...renderWithStore(<BoardContent projectId="p1" />), fetchMock };
}

const column = (name: string) => screen.getByRole("region", { name });
const cardTitles = (name: string) =>
  within(column(name))
    .queryAllByRole("button", { name: /Press Enter to open/ })
    .map((card) => card.getAttribute("aria-label")?.split(".")[0]);

describe("BoardContent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("while loading: a busy status at once, then the board's skeleton after 200ms, then the board", async () => {
    let answer: (response: Response) => void = () => {};
    mockFetch((request) =>
      new URL(request.url).pathname === "/api/me"
        ? jsonResponse(200, me)
        : new Promise<Response>((resolve) => (answer = resolve))
    );
    renderWithStore(<BoardContent projectId="p1" />);

    const status = screen.getByRole("status");
    expect(status).toHaveTextContent("Loading the board");
    expect(status.closest("[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByText(/Loading the board…/)).not.toBeInTheDocument();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);

    // Breadcrumb, tile, two text bars, 3 avatars, 4 pills, then 3 columns of (2 header bars + 2/3/4 cards).
    await vi.waitFor(() => expect(document.querySelectorAll(".skeleton")).toHaveLength(1 + 1 + 2 + 3 + 4 + 6 + 9));
    expect(document.querySelectorAll(".skeleton:not([aria-hidden='true'])")).toHaveLength(0);
    expect(document.querySelectorAll(".skeleton-on-sunken")).toHaveLength(6 + 9);

    answer(jsonResponse(200, boardWith()));
    expect(await screen.findByText("3 tasks · 1 done · 2 members")).toBeInTheDocument();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);
    expect(document.querySelector("[aria-busy]")).toBeNull();
  });

  it("shows the header summary, every column and its cards in order, and the done column's badge", async () => {
    renderBoard();

    expect(await screen.findByText("3 tasks · 1 done · 2 members")).toBeInTheDocument();
    expect(cardTitles("To do")).toEqual(["Fix login", "Write copy"]);
    expect(cardTitles("Done")).toEqual(["Ship it"]);
    expect(within(column("Done")).getByText("Done column")).toBeInTheDocument();
  });

  it("gives the owner an Invite button that opens the invite form in a dialog", async () => {
    renderBoard(boardWith(), () =>
      jsonResponse(201, { id: "inv1", email: "ada@team.dev", sentAt: "", expiresAt: "", resent: false })
    );

    await userEvent.click(await screen.findByRole("button", { name: "Invite" }));
    const dialog = screen.getByRole("dialog", { name: "Invite to Website relaunch" });
    await userEvent.type(within(dialog).getByLabelText("Invite by email"), "ada@team.dev");
    await userEvent.click(within(dialog).getByRole("button", { name: "Send invite" }));

    expect(await within(dialog).findByText("Invite sent to ada@team.dev.")).toBeInTheDocument();
  });

  it("shows no Invite button to members", async () => {
    renderBoard(boardWith({ me: boardMembership({ role: "MEMBER" }) }));

    await screen.findByText("3 tasks · 1 done · 2 members");
    expect(screen.queryByRole("button", { name: "Invite" })).not.toBeInTheDocument();
  });

  it("filters by priority and by only my tasks", async () => {
    renderBoard();
    await screen.findByText("Fix login");

    await userEvent.click(screen.getByRole("button", { name: "Low" }));
    expect(cardTitles("To do")).toEqual(["Write copy"]);

    await userEvent.click(screen.getByRole("button", { name: "All" }));
    await userEvent.click(screen.getByRole("button", { name: "Only my tasks" }));
    expect(cardTitles("To do")).toEqual(["Fix login"]);
    expect(screen.getByRole("button", { name: "Only my tasks" })).toHaveAttribute("aria-pressed", "true");
  });

  it("keeps a task hidden while its delete waits out the Undo window, even after a refetch", async () => {
    const { store } = renderBoard();
    await screen.findByText("Fix login");

    act(() => {
      store.dispatch(taskDeletePending("a"));
    });
    expect(cardTitles("To do")).toEqual(["Write copy"]);

    // The server still has the task (the DELETE isn't sent yet); a refetch must not show it.
    await act(async () => {
      await store.dispatch(projectsService.endpoints.getProject.initiate("p1", { forceRefetch: true }));
    });
    expect(cardTitles("To do")).toEqual(["Write copy"]);
  });

  it("gives the owner a column menu and Add column, and a member neither", async () => {
    renderBoard();
    await screen.findByText("Fix login");
    expect(screen.getByRole("button", { name: "Column options for To do" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add column" })).toBeInTheDocument();
  });

  it("gives members a grip handle on every column, and no Add column while the switch is off", async () => {
    renderBoard(boardWith({ me: boardMembership({ role: "MEMBER" }) }));
    await screen.findByText("Fix login");

    expect(screen.getByRole("button", { name: "Move column To do" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add column" })).not.toBeInTheDocument();
  });

  it("shows the description under the name, or the owner a quiet way to add one", async () => {
    renderBoard(boardWith({ description: "For the launch" }));
    expect(await screen.findByText("For the launch")).toBeInTheDocument();
  });

  it("lets the owner add a description inline, saving on Enter", async () => {
    const { fetchMock } = renderBoard(boardWith(), () => jsonResponse(200, boardWith({ description: "New one" })));
    await userEvent.click(await screen.findByRole("button", { name: "+ Add a description" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Project description" }), "New one{Enter}");

    await vi.waitFor(() => expect(screen.getByText("New one")).toBeInTheDocument());
    const patch = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "PATCH");
    expect(await patch?.json()).toEqual({ description: "New one" });
  });

  it("Esc cancels the inline description, and members never see the add link", async () => {
    renderBoard(boardWith());
    await userEvent.click(await screen.findByRole("button", { name: "+ Add a description" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "+ Add a description" })).toBeInTheDocument();
  });

  it("shows a member's own column order, with Your order and a reset", async () => {
    renderBoard(boardWith({ me: boardMembership({ role: "MEMBER", columnOrder: ["done", "todo", "doing"] }) }));
    await screen.findByText("Fix login");

    const columns = screen.getAllByRole("region").map((region) => region.getAttribute("aria-label"));
    expect(columns).toEqual(["Done", "To do", "In progress"]);
    expect(screen.getByText("Your order")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to team order" })).toBeInTheDocument();
  });

  describe("quick add", () => {
    it("Enter adds the task and keeps the field open and empty for the next one; Esc closes", async () => {
      const { fetchMock } = renderBoard(boardWith(), () =>
        jsonResponse(201, boardTask("new", { title: "New task", position: 3000 }))
      );
      await screen.findByText("Fix login");

      await userEvent.click(screen.getByRole("button", { name: "Add a task to To do" }));
      const field = screen.getByRole("textbox", { name: "New task in To do" });
      await userEvent.type(field, "New task{Enter}");

      await vi.waitFor(() => expect(cardTitles("To do")).toEqual(["Fix login", "Write copy", "New task"]));
      expect(screen.getByRole("textbox", { name: "New task in To do" })).toHaveValue("");
      const post = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "POST");
      expect(await post?.json()).toEqual({ title: "New task", columnId: "todo" });

      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("textbox", { name: "New task in To do" })).not.toBeInTheDocument();
    });

    it("keeps the text when the add fails", async () => {
      renderBoard(boardWith(), () =>
        jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } })
      );
      await screen.findByText("Fix login");

      await userEvent.click(screen.getByRole("button", { name: "Add a task to To do" }));
      await userEvent.type(screen.getByRole("textbox", { name: "New task in To do" }), "Keep me{Enter}");

      await vi.waitFor(() => expect(screen.getByRole("textbox", { name: "New task in To do" })).toHaveValue("Keep me"));
    });
  });
});
