// How a task is read from the database and sent to the browser, in one place, so the board
// (GET /api/projects/:projectId) and every task write return exactly the same shape. Also the
// shared checks every task service starts with.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardTask } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { permissionContext, requireMember, type Db, type Membership } from "@/server/projects/projectAccess";
import type { PermissionContext } from "@/utilities/helpers/permissions";

export const taskSelect = {
  id: true,
  projectId: true,
  columnId: true,
  title: true,
  description: true,
  priority: true,
  position: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  createdById: true,
  takenFromPoolAt: true,
  seenByOwnerAt: true,
  assignee: { select: { id: true, name: true, image: true } },
} as const;

export type TaskRow = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export function toBoardTask(task: TaskRow): BoardTask {
  return {
    id: task.id,
    columnId: task.columnId,
    title: task.title,
    description: task.description,
    priority: task.priority,
    position: task.position,
    dueDate: task.dueDate ? task.dueDate.toISOString().slice(0, 10) : null,
    assignee: task.assignee,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    createdById: task.createdById,
    takenFromPool: task.takenFromPoolAt !== null,
    newForOwner: task.seenByOwnerAt === null,
  };
}

/** A YYYY-MM-DD day as the Date Prisma stores in a @db.Date column. */
export const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`);

export const taskNotFound = () => new ApiError(404, "TASK_NOT_FOUND", "We couldn't find that task.");

/**
 * The task and my membership of its project. A task in a project I'm not in is "not found",
 * like the project itself: nothing tells a non-member that it exists.
 */
export async function requireTaskAccess(
  db: Db,
  userId: string,
  taskId: string
): Promise<{ task: TaskRow; membership: Membership }> {
  const task = await db.task.findUnique({ where: { id: taskId }, select: taskSelect });
  if (!task) throw taskNotFound();
  try {
    return { task, membership: await requireMember(db, userId, task.projectId) };
  } catch {
    throw taskNotFound();
  }
}

/** can()'s context for an action on this task. */
export const taskContext = (
  userId: string,
  membership: Membership,
  task: Pick<TaskRow, "createdById" | "assignee"> & { inDoneColumn?: boolean },
  extra: Omit<PermissionContext, "me" | "membership" | "task"> & { takenOpenCount?: number } = {}
) =>
  permissionContext(userId, membership, {
    ...extra,
    task: { createdById: task.createdById, assigneeId: task.assignee?.id ?? null, inDoneColumn: task.inDoneColumn },
  });

/**
 * Open tasks I took from the pool in this project: still mine, taken with "Assign to me", and not
 * in the done column. Tasks I created, or that the owner or a manager gave me, don't count.
 */
export function countTakenOpen(db: Db, userId: string, projectId: string) {
  return db.task.count({
    where: { projectId, assigneeId: userId, takenFromPoolAt: { not: null }, column: { isDone: false } },
  });
}
