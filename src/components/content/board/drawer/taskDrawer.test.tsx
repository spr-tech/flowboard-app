import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { projectsService } from "@/services/projectsService";
import { selectPendingDeleteTaskIds } from "@/stores/uiSlice";
import { boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { AUTOSAVE_DELAY_MS } from "./useTaskAutosave";
import { TaskDrawer } from "./taskDrawer";

const nav = vi.hoisted(() => ({ params: new URLSearchParams(), push: vi.fn(), replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: nav.replace }),
  usePathname: () => "/projects/p1",
  useSearchParams: () => nav.params,
}));
vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const board = projectDetail({
  tasks: [boardTask("a", { title: "Fix login", description: "Steps", dueDate: "2026-11-30" })],
});

/** The task's own history, newest first. */
const history = [
  {
    id: "h2",
    action: "task.moved",
    meta: { title: "Fix login", from: "To do", to: "Review" },
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    actor: { id: "demo", name: "Alex Morgan", image: null },
    project: { id: "p1", name: "Website relaunch", colour: "vermilion" },
    task: { id: "a", title: "Fix login" },
  },
  {
    id: "h1",
    action: "task.created",
    meta: { title: "Fix login", column: "To do" },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    actor: { id: "sam", name: "Sam Rivera", image: null },
    project: { id: "p1", name: "Website relaunch", colour: "vermilion" },
    task: { id: "a", title: "Fix login" },
  },
];

/** Renders the drawer for ?task=<id>, with the board cached; writes answer 200 with the task. */
async function openDrawer(taskId: string) {
  nav.params = new URLSearchParams({ task: taskId });
  const fetchMock = mockFetch((request) =>
    request.method !== "GET"
      ? jsonResponse(200, board.tasks[0])
      : request.url.endsWith("/activity")
        ? jsonResponse(200, history)
        : jsonResponse(200, board)
  );
  const view = renderWithStore(<div />);
  await view.store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  view.rerender(<TaskDrawer project={board} meId="demo" />);
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  return { ...view, writes };
}

describe("TaskDrawer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens from ?task= with every field, titled with the project and column", async () => {
    await openDrawer("a");

    expect(screen.getByRole("dialog", { name: "Website relaunch · To do" })).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Fix login");
    expect(screen.getByLabelText("Column")).toHaveValue("todo");
    expect(screen.getByLabelText("Assignee")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("MEDIUM");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-11-30");
    expect(screen.getByLabelText("Description")).toHaveValue("Steps");
    expect(screen.getByRole("option", { name: "Alex Morgan (you)" })).toBeInTheDocument();
  });

  it("shows the task's own history instead of when it was created", async () => {
    await openDrawer("a");

    const history = await screen.findByRole("list");
    expect(history).toHaveTextContent("You moved it to Review · 2 hours ago");
    expect(history).toHaveTextContent("Sam Rivera created it in To do · 3 days ago");
    expect(screen.queryByText(/^Created /)).not.toBeInTheDocument();
  });

  it("closes quietly (removing ?task=) for a task that isn't on the board", async () => {
    await openDrawer("missing");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(nav.replace).toHaveBeenCalledWith("/projects/p1", { scroll: false });
  });

  it("saves the title after a pause in typing, not on every keystroke", async () => {
    const { writes } = await openDrawer("a");

    await userEvent.type(screen.getByLabelText("Title"), "!!");
    expect(writes()).toHaveLength(0);

    await vi.waitFor(() => expect(writes()).toHaveLength(1), { timeout: AUTOSAVE_DELAY_MS + 1000 });
    expect(await writes()[0].json()).toEqual({ title: "Fix login!!" });
  });

  it("closing the drawer saves a waiting edit immediately instead of dropping it", async () => {
    const { writes } = await openDrawer("a");

    await userEvent.type(screen.getByLabelText("Description"), " and more");
    await userEvent.keyboard("{Escape}");

    // Sent at once, well before the 800ms timer would have fired.
    expect(writes()).toHaveLength(1);
    expect(await writes()[0].json()).toEqual({ description: "Steps and more" });
    expect(nav.replace).toHaveBeenCalledWith("/projects/p1", { scroll: false });
  });

  it("navigating away (the drawer unmounts) also saves a waiting edit immediately", async () => {
    const { writes, unmount } = await openDrawer("a");

    await userEvent.type(screen.getByLabelText("Title"), " now");
    unmount();

    // Within 200ms: the request starts on the next tick, long before the 800ms timer.
    await vi.waitFor(() => expect(writes()).toHaveLength(1), { timeout: 200 });
    expect(await writes()[0].json()).toEqual({ title: "Fix login now" });
  });

  it("won't save an empty title, and says why", async () => {
    const { writes } = await openDrawer("a");

    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.tab();

    expect(await screen.findByText("Give the task a title")).toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it("selects save at once; the column select moves the task to the bottom of that column", async () => {
    const { writes } = await openDrawer("a");

    await userEvent.selectOptions(screen.getByLabelText("Priority"), "HIGH");
    await userEvent.selectOptions(screen.getByLabelText("Column"), "doing");

    const [priority, move] = writes();
    expect(await priority.json()).toEqual({ priority: "HIGH" });
    expect(new URL(move.url).pathname).toBe("/api/tasks/a/move");
    expect(await move.json()).toEqual({ columnId: "doing" });
  });

  it("Delete task hides it with an Undo toast and closes the drawer, without a confirm dialog", async () => {
    const { store, writes } = await openDrawer("a");

    await userEvent.click(screen.getByRole("button", { name: "Delete task" }));

    expect(selectPendingDeleteTaskIds(store.getState())).toEqual(["a"]);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ message: "Task deleted", action: expect.anything() }));
    expect(nav.replace).toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });
});
