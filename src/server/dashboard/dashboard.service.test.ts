// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { getDashboardProjects, getMyTasks, getStats, getSummary } from "./dashboard.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/projects/projects.service", () => ({ listProjects: vi.fn() }));
const { listProjects } = await import("@/server/projects/projects.service");

const today = "2026-11-23";
const lagos = { today, tz: "Africa/Lagos" };
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const project = { id: "p1", name: "Website relaunch", colour: "vermilion" };

beforeEach(() => resetPrismaMock());

describe("getSummary", () => {
  it("counts my open work against the browser's today, and completions by its local days", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ name: "Alex Morgan" } as never);
    prismaMock.projectMember.count.mockResolvedValue(3);
    prismaMock.task.findMany
      .mockResolvedValueOnce([
        { dueDate: day("2026-11-21"), projectId: "p1" }, // 2 days late
        { dueDate: day("2026-11-22"), projectId: "p1" }, // 1 day late
        { dueDate: day("2026-11-23"), projectId: "p2" }, // today
        { dueDate: day("2026-11-29"), projectId: "p2" }, // 6 days on: this week
        { dueDate: day("2026-11-30"), projectId: "p2" }, // later
        { dueDate: null, projectId: "p3" },
      ] as never)
      .mockResolvedValueOnce([
        { completedAt: new Date("2026-11-23T23:30:00Z") }, // the 24th in Lagos: not yet
        { completedAt: new Date("2026-11-23T10:00:00Z") }, // today
        { completedAt: new Date("2026-11-16T23:30:00Z") }, // the 17th in Lagos: first day of the week
        { completedAt: new Date("2026-11-16T22:30:00Z") }, // the 16th: too old
      ] as never);

    expect(await getSummary("me", lagos)).toEqual({
      firstName: "Alex",
      projectCount: 3,
      assignedOpen: 6,
      assignedProjectCount: 3,
      dueThisWeek: 2,
      overdue: 2,
      oldestOverdueDays: 2,
      completedThisWeek: 2,
    });
  });

  it("says nothing is overdue when nothing is", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ name: null } as never);
    prismaMock.projectMember.count.mockResolvedValue(0);
    prismaMock.task.findMany.mockResolvedValue([]);

    expect(await getSummary("new", lagos)).toMatchObject({
      firstName: null,
      projectCount: 0,
      overdue: 0,
      oldestOverdueDays: null,
    });
  });
});

describe("getMyTasks", () => {
  const task = (id: string, due: string | null, extra: object = {}) => ({
    id,
    title: `Task ${id}`,
    priority: "MEDIUM",
    dueDate: due ? day(due) : null,
    completedAt: null,
    columnId: "todo",
    project,
    ...extra,
  });

  beforeEach(() => {
    prismaMock.column.findMany.mockResolvedValue([
      { id: "todo", projectId: "p1", isDone: false },
      { id: "doing", projectId: "p1", isDone: false },
      { id: "done", projectId: "p1", isDone: true },
    ] as never);
  });

  it("groups by due date in the design's order, leaving out empty groups", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      task("later", "2026-12-10"),
      task("none", null),
      task("late", "2026-11-20"),
      task("week", "2026-11-25"),
      task("today-low", "2026-11-23", { priority: "LOW" }),
      task("today-high", "2026-11-23", { priority: "HIGH" }),
    ] as never);

    const { groups } = await getMyTasks("me", lagos);

    expect(groups.map((group) => [group.key, group.tasks.map((t) => t.id)])).toEqual([
      ["overdue", ["late"]],
      ["today", ["today-high", "today-low"]],
      ["week", ["week"]],
      ["later", ["later"]],
      ["none", ["none"]],
    ]);
    expect(groups[0].tasks[0].project).toEqual({ ...project, doneColumnId: "done", reopenColumnId: "todo" });
  });

  it("keeps tasks completed today (local) in their group, and lists the week's completions", async () => {
    prismaMock.task.findMany.mockResolvedValue([
      task("ticked", "2026-11-23", { completedAt: new Date("2026-11-23T08:00:00Z"), columnId: "done" }),
      task("yesterday", "2026-11-20", { completedAt: new Date("2026-11-22T12:00:00Z"), columnId: "done" }),
      task("open", "2026-11-23"),
    ] as never);

    const { groups, completedThisWeek } = await getMyTasks("me", lagos);

    // Ticked today: still in Today (struck through by the page). Completed yesterday: gone.
    expect(groups.map((group) => group.key)).toEqual(["today"]);
    expect(groups[0].tasks.map((t) => t.id).sort()).toEqual(["open", "ticked"]);
    expect(groups[0].tasks.find((t) => t.id === "ticked")?.completedAt).toBe("2026-11-23T08:00:00.000Z");
    expect(completedThisWeek.map((t) => t.id)).toEqual(["ticked", "yesterday"]);
  });
});

describe("getStats", () => {
  it("counts completions per local day for 14 days, open work by priority, and the next 7 days", async () => {
    prismaMock.task.findMany
      .mockResolvedValueOnce([
        { completedAt: new Date("2026-11-23T09:00:00Z") },
        { completedAt: new Date("2026-11-22T23:30:00Z") }, // the 23rd in Lagos
        { completedAt: new Date("2026-11-10T12:00:00Z") }, // the first of the 14 days
        { completedAt: new Date("2026-11-09T12:00:00Z") }, // too old
      ] as never)
      .mockResolvedValueOnce([
        { priority: "HIGH", dueDate: day("2026-11-23") },
        { priority: "HIGH", dueDate: day("2026-11-29") },
        { priority: "LOW", dueDate: day("2026-11-30") },
        { priority: "MEDIUM", dueDate: null },
      ] as never);

    const stats = await getStats("me", lagos);

    expect(stats.completedPerDay).toHaveLength(14);
    expect(stats.completedPerDay[0]).toEqual({ date: "2026-11-10", count: 1 });
    expect(stats.completedPerDay[13]).toEqual({ date: "2026-11-23", count: 2 });
    expect(stats.completedPerDay.reduce((sum, d) => sum + d.count, 0)).toBe(3);
    expect(stats.openByPriority).toEqual({ HIGH: 2, MEDIUM: 1, LOW: 1 });
    expect(stats.next7Days.map((d) => d.date)).toEqual([
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
      "2026-11-27",
      "2026-11-28",
      "2026-11-29",
    ]);
    expect(stats.next7Days.map((d) => d.count)).toEqual([1, 0, 0, 0, 0, 0, 1]);
  });
});

describe("getDashboardProjects", () => {
  const summary = (id: string, me: object) => ({
    id,
    name: id,
    colour: "lime",
    description: null,
    updatedAt: "2026-11-20T00:00:00Z",
    taskCount: 4,
    doneCount: 1,
    overdueCount: 0,
    nextDueDate: null,
    memberCount: 1,
    members: [],
    me: { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: "2026-11-01T00:00:00Z", ...me },
  });

  it("orders like the sidebar (pinned first, then most recently opened) and keeps 5", async () => {
    vi.mocked(listProjects).mockResolvedValue([
      summary("a", { lastOpenedAt: "2026-11-20T00:00:00Z" }),
      summary("b", { lastOpenedAt: "2026-11-22T00:00:00Z" }),
      summary("pinned", { pinnedAt: "2026-11-02T00:00:00Z" }),
      summary("c", {}),
      summary("d", {}),
      summary("e", {}),
    ] as never);

    const rows = await getDashboardProjects("me", lagos);

    expect(rows.map((row) => row.id)).toEqual(["pinned", "b", "a", "c", "d"]);
    expect(rows[0]).toEqual({
      id: "pinned",
      name: "pinned",
      colour: "lime",
      taskCount: 4,
      doneCount: 1,
      overdueCount: 0,
      nextDueDate: null,
      members: [],
    });
    expect(listProjects).toHaveBeenCalledWith("me", today);
  });
});
