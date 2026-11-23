// The dashboard (docs/designs/app-screens.md, "Dashboard"; docs/plan/04-api.md). "My" tasks are
// the ones assigned to me; removing a member unassigns theirs, so every one is in a project I'm in.
// Every answer depends on the browser's `today` and time zone, never the server's clock.
import type {
  DashboardProject,
  DashboardStats,
  DashboardSummary,
  DueGroupKey,
  MyTask,
  MyTasksResponse,
} from "@/models/responses/dashboardResponses";
import type { DashboardQuery } from "@/models/validations/dashboardValidation";
import { prisma } from "@/server/lib/prisma";
import { listProjects } from "@/server/projects/projects.service";
import { selectSidebarProjects } from "@/utilities/helpers/projectOrder";
import { addDays, completedSince, dayRange, daysBetween, dueDay, dueGroup, localDay } from "./dashboardDates";
import type { Prisma } from "@/lib/generated/prisma";
import type { ProjectRole } from "@/models/responses/projectResponses";
import { permissionsOf } from "@/server/projects/projectAccess";

const GROUP_ORDER: DueGroupKey[] = ["overdue", "today", "week", "later", "none"];
const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
const DASHBOARD_PROJECT_ROWS = 5;

export async function getSummary(userId: string, { today, tz }: DashboardQuery): Promise<DashboardSummary> {
  const [user, projectCount, open, completed] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } }),
    prisma.projectMember.count({ where: { userId } }),
    prisma.task.findMany({
      where: { assigneeId: userId, completedAt: null },
      select: { dueDate: true, projectId: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, completedAt: { gte: completedSince(today, 7) } },
      select: { completedAt: true },
    }),
  ]);

  const dueDays = open.map((task) => (task.dueDate ? dueDay(task.dueDate) : null));
  const overdueDays = dueDays.filter((day): day is string => day !== null && day < today);
  const weekEnd = addDays(today, 6);
  const weekStart = addDays(today, -6);

  return {
    firstName: user.name?.trim().split(/\s+/)[0] || null,
    projectCount,
    assignedOpen: open.length,
    assignedProjectCount: new Set(open.map((task) => task.projectId)).size,
    dueThisWeek: dueDays.filter((day) => day !== null && day >= today && day <= weekEnd).length,
    overdue: overdueDays.length,
    oldestOverdueDays: overdueDays.length ? daysBetween(overdueDays.sort()[0], today) : null,
    completedThisWeek: completed.filter(
      ({ completedAt }) => completedAt && localDay(completedAt, tz) >= weekStart && localDay(completedAt, tz) <= today
    ).length,
  };
}

/** My role and a manager's switches; a missing membership (it can't happen here) counts as a member. */
const toMyRole = (membership: { role: ProjectRole; permissions: Prisma.JsonValue } | undefined) =>
  membership
    ? { role: membership.role, permissions: permissionsOf(membership) }
    : { role: "MEMBER" as const, permissions: null };

/** Each project's done column, and the column a reopened task goes back to (the first other one). */
async function columnTargets(projectIds: string[]) {
  const columns = await prisma.column.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: { position: "asc" },
    select: { id: true, projectId: true, isDone: true },
  });
  const targets = new Map<string, { doneColumnId: string; reopenColumnId: string | null }>();
  for (const projectId of projectIds) {
    const own = columns.filter((column) => column.projectId === projectId);
    targets.set(projectId, {
      doneColumnId: own.find((column) => column.isDone)?.id ?? "",
      reopenColumnId: own.find((column) => !column.isDone)?.id ?? null,
    });
  }
  return targets;
}

const byDueThenPriority = (a: MyTask, b: MyTask) =>
  (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999") ||
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
  a.title.localeCompare(b.title);

export async function getMyTasks(userId: string, { today, tz }: DashboardQuery): Promise<MyTasksResponse> {
  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      OR: [{ completedAt: null }, { completedAt: { gte: completedSince(today, 7) } }],
    },
    select: {
      id: true,
      title: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      columnId: true,
      createdById: true,
      project: {
        select: {
          id: true,
          name: true,
          colour: true,
          // My role there, so the checkbox shows only when can() lets me move the task.
          members: { where: { userId }, select: { role: true, permissions: true } },
        },
      },
    },
  });
  const targets = await columnTargets([...new Set(tasks.map((task) => task.project.id))]);

  const weekStart = addDays(today, -6);
  const rows = tasks.map((task) => {
    const completedDay = task.completedAt ? localDay(task.completedAt, tz) : null;
    const myTask: MyTask = {
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate ? dueDay(task.dueDate) : null,
      completedAt: task.completedAt?.toISOString() ?? null,
      columnId: task.columnId,
      createdById: task.createdById,
      project: {
        id: task.project.id,
        name: task.project.name,
        colour: task.project.colour,
        me: toMyRole(task.project.members[0]),
        ...targets.get(task.project.id)!,
      },
    };
    return { myTask, completedDay };
  });

  // Open tasks, plus those completed today (they stay in their group, struck through).
  const listed = rows.filter(({ completedDay }) => completedDay === null || completedDay === today);
  const groups = GROUP_ORDER.map((key) => ({
    key,
    tasks: listed
      .map(({ myTask }) => myTask)
      .filter((task) => dueGroup(task.dueDate, today) === key)
      .sort(byDueThenPriority),
  })).filter((group) => group.tasks.length > 0);

  const completedThisWeek = rows
    .filter(({ completedDay }) => completedDay !== null && completedDay >= weekStart && completedDay <= today)
    .map(({ myTask }) => myTask)
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""));

  return { groups, completedThisWeek };
}

export async function getStats(userId: string, { today, tz }: DashboardQuery): Promise<DashboardStats> {
  const [completed, open] = await Promise.all([
    prisma.task.findMany({
      where: { assigneeId: userId, completedAt: { gte: completedSince(today, 14) } },
      select: { completedAt: true },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, completedAt: null },
      select: { priority: true, dueDate: true },
    }),
  ]);

  const completedDays = completed.map(({ completedAt }) => (completedAt ? localDay(completedAt, tz) : ""));
  const dueDays = open.map(({ dueDate }) => (dueDate ? dueDay(dueDate) : null));
  const openByPriority = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const { priority } of open) openByPriority[priority] += 1;

  return {
    completedPerDay: dayRange(addDays(today, -13), 14).map((date) => ({
      date,
      count: completedDays.filter((day) => day === date).length,
    })),
    openByPriority,
    next7Days: dayRange(today, 7).map((date) => ({ date, count: dueDays.filter((day) => day === date).length })),
  };
}

/** Up to 5 of my projects with progress: the sidebar's order (pinned first, then most recently opened). */
export async function getDashboardProjects(userId: string, { today }: DashboardQuery): Promise<DashboardProject[]> {
  const projects = await listProjects(userId, today);
  return selectSidebarProjects(projects, DASHBOARD_PROJECT_ROWS).map(
    ({ id, name, colour, taskCount, doneCount, overdueCount, nextDueDate, members }) => ({
      id,
      name,
      colour,
      taskCount,
      doneCount,
      overdueCount,
      nextDueDate,
      members,
    })
  );
}
