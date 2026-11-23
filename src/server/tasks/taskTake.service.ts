// "Assign to me" (taking an unassigned task from the pool) and the owner's "seen" mark that
// clears the "New" badge (docs/plan/04-api.md, "Tasks").
import type { BoardTask } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { transaction } from "@/server/lib/transaction";
import { ownerOnly } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { can, PermissionReason } from "@/utilities/helpers/permissions";
import { countTakenOpen, requireTaskAccess, taskContext, taskSelect, toBoardTask } from "./taskShape";

const alreadyAssigned = () => new ApiError(409, "TASK_ALREADY_ASSIGNED", "Someone is already on this task.");

/**
 * I take an unassigned task that isn't in the done column (409 TASK_DONE). Members may hold up to the project's take limit of open taken tasks
 * (409 TAKE_LIMIT_REACHED); the owner and managers have no limit. My membership row is locked
 * for the transaction, so two quick takes can't both slip under the limit, and the assignment is
 * conditional, so two people can't both take the same task.
 */
export async function takeTask(userId: string, taskId: string, now = new Date()): Promise<BoardTask> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    if (task.assignee) throw alreadyAssigned();
    await tx.$executeRaw`SELECT 1 FROM "ProjectMember" WHERE "userId" = ${userId} AND "projectId" = ${task.projectId} FOR UPDATE`;
    const [project, takenOpenCount, column] = await Promise.all([
      tx.project.findUniqueOrThrow({ where: { id: task.projectId }, select: { memberTakeLimit: true } }),
      countTakenOpen(tx, userId, task.projectId),
      tx.column.findUnique({ where: { id: task.columnId }, select: { isDone: true } }),
    ]);
    const inDoneColumn = column?.isDone === true;
    const result = can(
      "task.take",
      taskContext(userId, membership, { ...task, inDoneColumn }, { project, takenOpenCount })
    );
    if (!result.allowed) {
      const code = result.reason === PermissionReason.takeDone ? "TASK_DONE" : "TAKE_LIMIT_REACHED";
      throw new ApiError(409, code, result.reason);
    }

    const { count } = await tx.task.updateMany({
      where: { id: taskId, assigneeId: null },
      data: { assigneeId: userId, takenFromPoolAt: now },
    });
    if (count === 0) throw alreadyAssigned();
    await tx.activity.create({
      data: {
        projectId: task.projectId,
        actorId: userId,
        action: ActivityAction.TaskTaken,
        taskId,
        meta: { title: task.title },
      },
    });
    return toBoardTask(await tx.task.findUniqueOrThrow({ where: { id: taskId }, select: taskSelect }));
  });
}

/**
 * The owner opened the task: it is no longer "New". Owner only; no Activity row (like recording a
 * visit, it changes nothing anyone else sees). Already seen: unchanged.
 */
export async function markTaskSeen(userId: string, taskId: string, now = new Date()): Promise<BoardTask> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    if (membership.role !== "OWNER") throw ownerOnly();
    if (task.seenByOwnerAt) return toBoardTask(task);
    return toBoardTask(
      await tx.task.update({ where: { id: taskId }, data: { seenByOwnerAt: now }, select: taskSelect })
    );
  });
}
