// How a task is read from the database and sent to the browser, in one place, so the board
// (GET /api/projects/:projectId) and every task write return exactly the same shape.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardTask } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { requireMember, type Db, type Membership } from "@/server/projects/projectAccess";

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
