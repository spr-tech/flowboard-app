import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardSummary, MyTask, MyTasksResponse } from "@/models/responses/dashboardResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import type { DashboardFilter } from "@/utilities/helpers/dashboardFilter";
import { localToday } from "@/utilities/helpers/localToday";
import DashboardContent from "./dashboardContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace, push: vi.fn(), refresh: vi.fn() }) }));

const today = localToday();
const addDays = (count: number) => {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

const summary: DashboardSummary = {
  firstName: "Alex",
  projectCount: 2,
  assignedOpen: 3,
  assignedProjectCount: 2,
  dueThisWeek: 1,
  overdue: 1,
  oldestOverdueDays: 2,
  completedThisWeek: 4,
};
const project = {
  id: "p1",
  name: "Website relaunch",
  colour: "vermilion" as const,
  doneColumnId: "done",
  reopenColumnId: "todo",
};
const task = (id: string, title: string, dueDate: string | null, extra: Partial<MyTask> = {}): MyTask => ({
  id,
  title,
  priority: "MEDIUM",
  dueDate,
  completedAt: null,
  columnId: "todo",
  project,
  ...extra,
});
const myTasks: MyTasksResponse = {
  groups: [
    { key: "overdue", tasks: [task("t1", "Fix sign-in", addDays(-2), { priority: "HIGH" })] },
    { key: "today", tasks: [task("t2", "Review pricing", today)] },
    { key: "none", tasks: [task("t3", "Explore WebSockets", null, { priority: "LOW" })] },
  ],
  completedThisWeek: [task("t9", "Set up the store", null, { completedAt: new Date().toISOString() })],
};
const activity = [
  {
    id: "a1",
    action: "task.moved",
    meta: { title: "Landing copy", from: "To do", to: "Done" },
    createdAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    actor: { id: "ada", name: "Ada", image: null },
    project: { id: "p1", name: "Website relaunch", colour: "vermilion" },
    task: { id: "t7", title: "Landing copy" },
  },
];

/** Answers like the API; the task move answers through `onMove`. */
function mockDashboard(overrides: { summary?: DashboardSummary; onMove?: () => Response | Promise<Response> } = {}) {
  return mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (request.method === "PATCH") return overrides.onMove?.() ?? jsonResponse(200, {});
    if (path === "/api/dashboard/summary") return jsonResponse(200, overrides.summary ?? summary);
    if (path === "/api/me/tasks") return jsonResponse(200, myTasks);
    if (path === "/api/dashboard/projects") {
      return jsonResponse(200, [
        { ...project, taskCount: 10, doneCount: 4, overdueCount: 2, nextDueDate: addDays(1), members: [] },
      ]);
    }
    if (path === "/api/dashboard/stats") {
      return jsonResponse(200, {
        completedPerDay: Array.from({ length: 14 }, (_, i) => ({ date: addDays(i - 13), count: i === 13 ? 2 : 0 })),
        openByPriority: { HIGH: 1, MEDIUM: 1, LOW: 1 },
        next7Days: Array.from({ length: 7 }, (_, i) => ({ date: addDays(i), count: i === 0 ? 1 : 0 })),
      });
    }
    if (path === "/api/dashboard/activity") return jsonResponse(200, activity);
    return jsonResponse(200, {
      id: "ada-me",
      name: "Alex Morgan",
      email: "demo@example.com",
      image: null,
      hasPassword: true,
    });
  });
}

const renderDashboard = (filter: DashboardFilter = "all") => renderWithStore(<DashboardContent filter={filter} />);
const myTasksCard = () => screen.getByRole("region", { name: "My tasks" });

beforeEach(() => vi.clearAllMocks());

describe("DashboardContent", () => {
  it("a new user with no projects sees only 'Create your first project'", async () => {
    const fetchMock = mockDashboard({ summary: { ...summary, projectCount: 0, assignedOpen: 0 } });
    renderDashboard();

    expect(await screen.findByRole("button", { name: "Create your first project" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "My tasks" })).not.toBeInTheDocument();
    const asked = fetchMock.mock.calls.map(([r]) => new URL((r as Request).url).pathname);
    expect(asked).not.toContain("/api/me/tasks");
    expect(asked).not.toContain("/api/dashboard/stats");
  });

  it("greets by first name, sums up, and sends the browser's day and time zone", async () => {
    const fetchMock = mockDashboard();
    renderDashboard();

    expect(await screen.findByText("Alex")).toBeInTheDocument();
    expect(screen.getByText(/You have/)).toHaveTextContent("You have 1 overdue and 1 due this week.");
    const summaryRequest = fetchMock.mock.calls
      .map(([r]) => new URL((r as Request).url))
      .find((url) => url.pathname === "/api/dashboard/summary");
    expect(summaryRequest?.searchParams.get("today")).toBe(today);
    expect(summaryRequest?.searchParams.get("tz")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("shows My tasks grouped, every other section, and the activity as sentences", async () => {
    mockDashboard();
    renderDashboard();

    const card = await screen.findByRole("region", { name: "My tasks" });
    expect(await within(card).findByRole("region", { name: /Overdue/ })).toHaveTextContent("Fix sign-in");
    expect(within(card).getByText("2 days late")).toHaveClass("text-danger");
    expect(within(card).getByRole("region", { name: /Today/ })).toHaveTextContent("Review pricing");
    expect(within(card).getByRole("region", { name: /No due date/ })).toHaveTextContent("Explore WebSockets");
    expect(await screen.findByText("Next due tomorrow · 2 overdue")).toBeInTheDocument();
    expect(await screen.findByText("3 open tasks assigned to you")).toBeInTheDocument();
    expect(await screen.findByLabelText(/^Today, .*: 1 task due$/)).toBeInTheDocument();
    const feed = await screen.findByRole("region", { name: "Team activity" });
    expect(await within(feed).findByText(/moved/)).toBeInTheDocument();
    expect(feed).toHaveTextContent("Ada moved Landing copy to Done");
    expect(feed).toHaveTextContent("Website relaunch · 12 minutes ago");
  });

  it("stat cards put their filter in the URL; clicking the active one clears it", async () => {
    mockDashboard();
    const view = renderDashboard();

    await userEvent.click(await screen.findByRole("button", { name: /^Overdue/ }));
    expect(replace).toHaveBeenLastCalledWith("/dashboard?filter=overdue", { scroll: false });

    view.rerender(<DashboardContent filter="overdue" />);
    const overdue = await screen.findByRole("button", { name: /^Overdue/ });
    expect(overdue).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(overdue);
    expect(replace).toHaveBeenLastCalledWith("/dashboard", { scroll: false });
  });

  it("filters My tasks: overdue only, this week (today included), or the week's completions", async () => {
    mockDashboard();
    const view = renderDashboard("overdue");

    await within(await screen.findByRole("region", { name: "My tasks" })).findByText("Fix sign-in");
    expect(myTasksCard()).not.toHaveTextContent("Review pricing");
    expect(within(myTasksCard()).getByRole("button", { name: "Clear the Overdue filter" })).toBeInTheDocument();

    view.rerender(<DashboardContent filter="week" />);
    expect(myTasksCard()).toHaveTextContent("Review pricing");
    expect(myTasksCard()).not.toHaveTextContent("Fix sign-in");

    view.rerender(<DashboardContent filter="done" />);
    expect(within(myTasksCard()).getByRole("region", { name: /Completed this week/ })).toHaveTextContent(
      "Set up the store"
    );
    await userEvent.click(within(myTasksCard()).getByRole("button", { name: "Clear the Completed this week filter" }));
    expect(replace).toHaveBeenLastCalledWith("/dashboard", { scroll: false });
  });

  it("ticks a task done at once (into its project's done column), and undoes it if the server refuses", async () => {
    let answer: (response: Response) => void = () => {};
    const fetchMock = mockDashboard({ onMove: () => new Promise<Response>((resolve) => (answer = resolve)) });
    renderDashboard();

    const box = await screen.findByRole("checkbox", { name: "Mark Review pricing done" });
    await userEvent.click(box);

    // Before the server answers: ticked and struck through.
    const ticked = screen.getByRole("checkbox", { name: "Mark Review pricing not done" });
    expect(ticked).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Review pricing")).toHaveClass("line-through");
    const move = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "PATCH");
    expect(new URL(move?.url ?? "").pathname).toBe("/api/tasks/t2/move");
    expect(await move?.json()).toEqual({ columnId: "done" });

    answer(jsonResponse(500, { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } }));

    expect(await screen.findByRole("checkbox", { name: "Mark Review pricing done" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByText("Review pricing")).not.toHaveClass("line-through");
  });
});
