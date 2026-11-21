// Projects (docs/plan/04-api.md, "Projects"). Every write runs in one transaction with its
// Activity row, and returns the updated object.
import type {
  DeleteProjectResponse,
  LeaveProjectResponse,
  ProjectDetail,
  ProjectSummary,
} from "@/models/responses/projectResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { ActivityAction } from "@/utilities/enums/activityActions";
import type { ProjectColour } from "@/utilities/enums/projectColours";
import {
  membershipSelect,
  projectNotFound,
  requireMember,
  requireOwner,
  toMyMembership,
  type Db,
} from "./projectAccess";
import { taskSelect, toBoardTask } from "@/server/tasks/taskShape";
import { recordVisit } from "./projectPins.service";

/** Every new board starts with these, Done last and marked as the done column. */
export const DEFAULT_COLUMNS = [
  { name: "To do", position: 1000, isDone: false },
  { name: "In progress", position: 2000, isDone: false },
  { name: "Done", position: 3000, isDone: true },
] as const;

/** How many member avatars a project card shows. */
const MEMBER_PREVIEW_COUNT = 4;

/** A YYYY-MM-DD day as the Date Prisma compares with a @db.Date column. */
const asDay = (day: string) => new Date(`${day}T00:00:00.000Z`);
const toDay = (date: Date) => date.toISOString().slice(0, 10);

/**
 * My projects as cards. `today` is the viewer's own calendar day (YYYY-MM-DD), sent by the
 * browser, so "overdue" and "next due" follow the viewer's time zone. A fixed number of queries
 * however many projects there are: one for the projects, then grouped counts.
 */
export async function listProjects(userId: string, today: string): Promise<ProjectSummary[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: {
      ...membershipSelect,
      project: {
        select: {
          id: true,
          name: true,
          colour: true,
          updatedAt: true,
          _count: { select: { members: true } },
          members: {
            // OWNER sorts before MEMBER (enum order), then longest-standing first.
            orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
            take: MEMBER_PREVIEW_COUNT,
            select: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      },
    },
  });
  if (memberships.length === 0) return [];

  const projectIds = { in: memberships.map((membership) => membership.project.id) };
  const day = asDay(today);
  const [totals, done, overdue, nextDue, activity] = await Promise.all([
    prisma.task.groupBy({ by: ["projectId"], where: { projectId: projectIds }, _count: { _all: true } }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { projectId: projectIds, column: { isDone: true } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { projectId: projectIds, completedAt: null, dueDate: { lt: day } },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { projectId: projectIds, completedAt: null, dueDate: { gte: day } },
      _min: { dueDate: true },
    }),
    prisma.activity.groupBy({ by: ["projectId"], where: { projectId: projectIds }, _max: { createdAt: true } }),
  ]);

  const countOf = (rows: { projectId: string; _count: { _all: number } }[], id: string) =>
    rows.find((row) => row.projectId === id)?._count._all ?? 0;

  return memberships
    .map(({ project, ...membership }): ProjectSummary => {
      const latestActivity = activity.find((row) => row.projectId === project.id)?._max.createdAt;
      const updatedAt = latestActivity && latestActivity > project.updatedAt ? latestActivity : project.updatedAt;
      const next = nextDue.find((row) => row.projectId === project.id)?._min.dueDate;
      return {
        id: project.id,
        name: project.name,
        colour: project.colour,
        updatedAt: updatedAt.toISOString(),
        taskCount: countOf(totals, project.id),
        doneCount: countOf(done, project.id),
        overdueCount: countOf(overdue, project.id),
        nextDueDate: next ? toDay(next) : null,
        memberCount: project._count.members,
        members: project.members.map(({ user }) => user),
        me: toMyMembership(membership),
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The whole board (project, columns, tasks, members, my membership), or 404 if I'm not a member. */
async function loadDetail(db: Db, userId: string, projectId: string): Promise<ProjectDetail> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      colour: true,
      createdAt: true,
      updatedAt: true,
      columns: {
        orderBy: { position: "asc" },
        select: { id: true, name: true, position: true, isDone: true, _count: { select: { tasks: true } } },
      },
      // Everyone, owner first then by joining; mine is picked out below.
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: { ...membershipSelect, user: { select: { id: true, name: true, image: true } } },
      },
    },
  });
  const membership = project?.members.find((member) => member.user.id === userId);
  if (!project || !membership) throw projectNotFound();
  const tasks = await db.task.findMany({
    where: { projectId },
    orderBy: [{ columnId: "asc" }, { position: "asc" }],
    select: taskSelect,
  });

  const columns = project.columns.map(({ _count, ...column }) => ({ ...column, taskCount: _count.tasks }));
  return {
    id: project.id,
    name: project.name,
    colour: project.colour,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    taskCount: columns.reduce((sum, column) => sum + column.taskCount, 0),
    columns,
    tasks: tasks.map(toBoardTask),
    members: project.members.map(({ role, user }) => ({ ...user, role })),
    me: toMyMembership(membership),
  };
}

/** Opening a project also records the visit (at most once a minute), for the sidebar's recents. */
export async function getProject(userId: string, projectId: string, now = new Date()): Promise<ProjectDetail> {
  await recordVisit(prisma, userId, projectId, now);
  return loadDetail(prisma, userId, projectId);
}

export async function createProject(
  userId: string,
  input: { name: string; colour: ProjectColour }
): Promise<ProjectDetail> {
  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        colour: input.colour,
        members: { create: { userId, role: "OWNER" } },
        columns: { create: DEFAULT_COLUMNS.map((column) => ({ ...column })) },
      },
      select: { id: true },
    });
    await tx.activity.create({
      data: {
        projectId: project.id,
        actorId: userId,
        action: ActivityAction.ProjectCreated,
        meta: { name: input.name },
      },
    });
    return loadDetail(tx, userId, project.id);
  });
}

/** Owner only. Writes only what really changed, with the before and after in the Activity row. */
export async function updateProject(
  userId: string,
  projectId: string,
  changes: { name?: string; colour?: ProjectColour }
): Promise<ProjectDetail> {
  return prisma.$transaction(async (tx) => {
    await requireOwner(tx, userId, projectId);
    const before = await tx.project.findUniqueOrThrow({
      where: { id: projectId },
      select: { name: true, colour: true },
    });

    const from: { name?: string; colour?: ProjectColour } = {};
    const to: { name?: string; colour?: ProjectColour } = {};
    if (changes.name !== undefined && changes.name !== before.name) {
      from.name = before.name;
      to.name = changes.name;
    }
    if (changes.colour !== undefined && changes.colour !== before.colour) {
      from.colour = before.colour;
      to.colour = changes.colour;
    }

    if (Object.keys(to).length > 0) {
      await tx.project.update({ where: { id: projectId }, data: to });
      await tx.activity.create({
        data: { projectId, actorId: userId, action: ActivityAction.ProjectUpdated, meta: { from, to } },
      });
    }
    return loadDetail(tx, userId, projectId);
  });
}

/**
 * Owner only, confirmed by typing the exact name. No Activity row: deleting the project
 * cascades to its activity, so the row would vanish in the same transaction. A log line instead.
 */
export async function deleteProject(
  userId: string,
  projectId: string,
  typedName: string
): Promise<DeleteProjectResponse> {
  return prisma.$transaction(async (tx) => {
    await requireOwner(tx, userId, projectId);
    const project = await tx.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true } });
    if (typedName !== project.name) {
      throw new ApiError(400, "NAME_MISMATCH", "The name doesn't match.", {
        name: "Type the project name exactly as it's shown",
      });
    }
    await tx.project.delete({ where: { id: projectId } });
    console.info(`[projects] project ${projectId} deleted by ${userId}`);
    return { id: projectId };
  });
}

/** Members only: the owner can't leave (they delete the project instead). Unassigns my tasks. */
export async function leaveProject(userId: string, projectId: string): Promise<LeaveProjectResponse> {
  return prisma.$transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    if (membership.role === "OWNER") {
      throw new ApiError(403, "OWNER_CANNOT_LEAVE", "Owners can't leave their own project. Delete it instead.");
    }
    const { count } = await tx.task.updateMany({
      where: { projectId, assigneeId: userId },
      data: { assigneeId: null },
    });
    await tx.activity.create({
      data: { projectId, actorId: userId, action: ActivityAction.MemberLeft, meta: { unassignedTaskCount: count } },
    });
    await tx.projectMember.delete({ where: { userId_projectId: { userId, projectId } } });
    return { projectId, unassignedTaskCount: count };
  });
}
