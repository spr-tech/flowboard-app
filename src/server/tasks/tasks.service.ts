// Tasks (docs/plan/04-api.md, "Tasks"): create, edit and delete. Who may do what is decided by
// can() (src/utilities/helpers/permissions.ts); a refusal is 403 TASK_FORBIDDEN with its reason.
// Every write runs in one transaction with its Activity row and returns the updated task. Moving
// is in taskMove.service.ts; "Assign to me" and the owner's "seen" mark in taskTake.service.ts.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardTask, DeletedResponse, TaskPriority } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { transaction } from "@/server/lib/transaction";
import { assertCan, permissionContext, requireMember, type Db } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { MEMBER_DESCRIPTION_MIN, taskCreateRules, type PermissionAction } from "@/utilities/helpers/permissions";
import { positionBetween } from "@/utilities/helpers/position";
import { dayToDate, requireTaskAccess, taskContext, taskSelect, toBoardTask } from "./taskShape";

const columnNotFound = () =>
  new ApiError(400, "COLUMN_NOT_FOUND", "That column isn't on this board. Refresh and try again.");

/** A column of this project, or 400. */
export async function requireColumn(db: Db, projectId: string, columnId: string) {
  const column = await db.column.findFirst({
    where: { id: columnId, projectId },
    select: { id: true, name: true, isDone: true },
  });
  if (!column) throw columnNotFound();
  return column;
}

/** The position after the column's last task (1000 in an empty column). */
async function bottomPosition(db: Db, columnId: string) {
  const last = await db.task.findFirst({
    where: { columnId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  return positionBetween(last?.position ?? null, null);
}

const shortDescription = () =>
  new ApiError(
    403,
    "TASK_FORBIDDEN",
    `Describe the task in at least ${MEMBER_DESCRIPTION_MIN} characters: what needs doing, and why.`,
    { description: `Write at least ${MEMBER_DESCRIPTION_MIN} characters` }
  );

/** A project member may be assigned; anyone else is 400. */
async function requireAssignee(db: Db, projectId: string, assigneeId: string) {
  const assignee = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: assigneeId, projectId } },
    select: { userId: true },
  });
  if (!assignee) {
    throw new ApiError(400, "ASSIGNEE_NOT_MEMBER", "Only project members can be assigned.", {
      assigneeId: "Pick someone on this project",
    });
  }
}

export type CreateTaskInput = {
  title: string;
  columnId: string;
  description?: string | null;
  dueDate?: string | null;
  assigneeId?: string | null;
};

/**
 * New tasks go at the bottom of their column, MEDIUM. The owner, and managers who may assign,
 * choose (or skip) the assignee, description and due date. Everyone else follows the member rule:
 * the task is theirs, with a description of at least 20 characters; the due date is set now or
 * never. Tasks created by members wait for the owner to open them ("New").
 */
export async function createTask(
  userId: string,
  projectId: string,
  input: CreateTaskInput,
  now = new Date()
): Promise<BoardTask> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    const column = await requireColumn(tx, projectId, input.columnId);
    const rules = taskCreateRules(permissionContext(userId, membership));
    const description = input.description?.trim() || null;

    let assigneeId = input.assigneeId ?? null;
    if (rules.assignToSelf) {
      if (assigneeId !== null && assigneeId !== userId) {
        assertCan("task.assignOthers", permissionContext(userId, membership));
      }
      if ((description?.length ?? 0) < rules.descriptionMin) throw shortDescription();
      assigneeId = userId;
    } else if (assigneeId) {
      await requireAssignee(tx, projectId, assigneeId);
    }

    const task = await tx.task.create({
      data: {
        projectId,
        columnId: column.id,
        title: input.title,
        description,
        dueDate: input.dueDate ? dayToDate(input.dueDate) : null,
        assigneeId,
        position: await bottomPosition(tx, column.id),
        createdById: userId,
        // Added straight into the done column: it's finished as of now.
        completedAt: column.isDone ? now : null,
        // Only members' tasks wait for the owner to see them.
        seenByOwnerAt: membership.role === "MEMBER" ? null : now,
      },
      select: taskSelect,
    });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: ActivityAction.TaskCreated,
        taskId: task.id,
        meta: { title: task.title, column: column.name },
      },
    });
    return toBoardTask(task);
  });
}

export type TaskChanges = {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
};

/** The action that guards each editable field. */
const FIELD_ACTION: Record<keyof TaskChanges, PermissionAction> = {
  title: "task.editTitle",
  description: "task.editDescription",
  priority: "task.editPriority",
  dueDate: "task.editDueDate",
  assigneeId: "task.assignOthers",
};

/**
 * Drawer edits. Only fields that really changed are written (and checked): no change means no
 * write. Each changed field must pass can(); a member's description stays 20+ characters. When
 * the owner or a manager reassigns a task, it no longer counts as taken from the pool.
 */
export async function updateTask(userId: string, taskId: string, changes: TaskChanges): Promise<BoardTask> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    const current = toBoardTask(task);
    const description = changes.description === undefined ? undefined : changes.description?.trim() || null;

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (changes.title !== undefined && changes.title !== task.title) data.title = changes.title;
    if (description !== undefined && description !== task.description) data.description = description;
    if (changes.priority !== undefined && changes.priority !== task.priority) data.priority = changes.priority;
    if (changes.assigneeId !== undefined && changes.assigneeId !== (task.assignee?.id ?? null)) {
      data.assigneeId = changes.assigneeId;
    }
    if (changes.dueDate !== undefined && changes.dueDate !== current.dueDate) {
      data.dueDate = changes.dueDate === null ? null : dayToDate(changes.dueDate);
    }
    const fields = Object.keys(data) as (keyof TaskChanges)[];
    if (fields.length === 0) return current;

    const ctx = taskContext(userId, membership, task);
    for (const field of fields) assertCan(FIELD_ACTION[field], ctx);
    if (data.description !== undefined) {
      const { descriptionMin } = taskCreateRules(ctx);
      if ((description?.length ?? 0) < descriptionMin) throw shortDescription();
    }
    if (data.assigneeId !== undefined) {
      if (changes.assigneeId) await requireAssignee(tx, task.projectId, changes.assigneeId);
      // Given (or taken away) by the owner or a manager: no longer "taken from the pool".
      data.takenFromPoolAt = null;
    }

    const updated = await tx.task.update({ where: { id: taskId }, data, select: taskSelect });
    await tx.activity.create({
      data: {
        projectId: task.projectId,
        actorId: userId,
        action: ActivityAction.TaskUpdated,
        taskId,
        // A new assignee is recorded by name too, so the feed can say "assigned X to Sam".
        meta: {
          title: updated.title,
          fields,
          ...(fields.includes("assigneeId")
            ? { assignee: updated.assignee ? { id: updated.assignee.id, name: updated.assignee.name } : null }
            : {}),
        },
      },
    });
    return toBoardTask(updated);
  });
}

/**
 * Deletes the task (members: only tasks they created; managers with deleteAnyTask and the owner:
 * any). Its activity stays (taskId becomes null); the title is kept in meta.
 */
export async function deleteTask(userId: string, taskId: string): Promise<DeletedResponse> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    assertCan("task.delete", taskContext(userId, membership, task));
    await tx.activity.create({
      data: {
        projectId: task.projectId,
        actorId: userId,
        action: ActivityAction.TaskDeleted,
        taskId,
        meta: { title: task.title },
      },
    });
    await tx.task.delete({ where: { id: taskId } });
    return { id: taskId };
  });
}
