// Tasks (docs/plan/04-api.md, "Tasks" and "Moving a task"). Any member may change tasks. Every
// write runs in one transaction with its Activity row and returns the updated task.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardTask, DeletedResponse, TaskPriority } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { requireMember, type Db } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { needsRespace, positionBetween, respacedPositions } from "@/utilities/helpers/position";
import { dayToDate, requireTaskAccess, taskSelect, toBoardTask } from "./taskShape";

const columnNotFound = () =>
  new ApiError(400, "COLUMN_NOT_FOUND", "That column isn't on this board. Refresh and try again.");

/** A column of this project, or 400. */
async function requireColumn(db: Db, projectId: string, columnId: string) {
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

/** New tasks go at the bottom of their column: MEDIUM, unassigned, no due date. */
export async function createTask(
  userId: string,
  projectId: string,
  input: { title: string; columnId: string },
  now = new Date()
): Promise<BoardTask> {
  return prisma.$transaction(async (tx) => {
    await requireMember(tx, userId, projectId);
    const column = await requireColumn(tx, projectId, input.columnId);
    const task = await tx.task.create({
      data: {
        projectId,
        columnId: column.id,
        title: input.title,
        position: await bottomPosition(tx, column.id),
        createdById: userId,
        // Added straight into the done column: it's finished as of now.
        completedAt: column.isDone ? now : null,
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

/** Drawer edits. Only fields that really changed are written; no change means no write. */
export async function updateTask(userId: string, taskId: string, changes: TaskChanges): Promise<BoardTask> {
  return prisma.$transaction(async (tx) => {
    const { task } = await requireTaskAccess(tx, userId, taskId);

    if (changes.assigneeId) {
      const assignee = await tx.projectMember.findUnique({
        where: { userId_projectId: { userId: changes.assigneeId, projectId: task.projectId } },
        select: { userId: true },
      });
      if (!assignee) {
        throw new ApiError(400, "ASSIGNEE_NOT_MEMBER", "Only project members can be assigned.", {
          assigneeId: "Pick someone on this project",
        });
      }
    }

    const description = changes.description === undefined ? undefined : changes.description?.trim() || null;
    const current = toBoardTask(task);
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
    const fields = Object.keys(data);
    if (fields.length === 0) return current;

    const updated = await tx.task.update({ where: { id: taskId }, data, select: taskSelect });
    await tx.activity.create({
      data: {
        projectId: task.projectId,
        actorId: userId,
        action: ActivityAction.TaskUpdated,
        taskId,
        meta: { title: updated.title, fields },
      },
    });
    return toBoardTask(updated);
  });
}

export type MoveInput = { columnId: string; afterTaskId?: string; beforeTaskId?: string };

const badNeighbour = () =>
  new ApiError(400, "INVALID_POSITION", "The board changed while you were moving that card. Refresh and try again.");

/**
 * The card's new neighbours in the target column (excluding the card itself), from the database's
 * current order. Given one neighbour, the other side is whatever is next to it right now; given
 * none, the card goes to the bottom.
 */
async function findNeighbours(db: Db, taskId: string, columnId: string, input: MoveInput) {
  const others = await db.task.findMany({
    where: { columnId, id: { not: taskId } },
    orderBy: { position: "asc" },
    select: { id: true, position: true },
  });
  const indexOf = (id: string | undefined) => {
    if (id === undefined) return undefined;
    const index = others.findIndex((task) => task.id === id);
    if (index < 0) throw badNeighbour();
    return index;
  };
  const afterIndex = indexOf(input.afterTaskId);
  const beforeIndex = indexOf(input.beforeTaskId);

  let aboveIndex: number;
  if (afterIndex !== undefined) aboveIndex = afterIndex;
  else if (beforeIndex !== undefined) aboveIndex = beforeIndex - 1;
  else aboveIndex = others.length - 1;
  if (beforeIndex !== undefined && beforeIndex !== aboveIndex + 1) throw badNeighbour();

  return { others, aboveIndex };
}

/**
 * Moves a card (one transaction): checks the column and neighbours, computes the position from
 * the neighbours' current positions, re-spaces the column if the gap is too small, sets or
 * clears completedAt, and writes one Activity row when the column changed.
 */
export async function moveTask(userId: string, taskId: string, input: MoveInput, now = new Date()): Promise<BoardTask> {
  return prisma.$transaction(async (tx) => {
    const { task } = await requireTaskAccess(tx, userId, taskId);
    const target = await requireColumn(tx, task.projectId, input.columnId);
    const { others, aboveIndex } = await findNeighbours(tx, taskId, target.id, input);

    let positions = others.map((other) => other.position);
    const at = (index: number) => (index >= 0 && index < positions.length ? positions[index] : null);
    if (needsRespace(at(aboveIndex), at(aboveIndex + 1))) {
      positions = respacedPositions(others.length);
      await Promise.all(
        others.map((other, index) =>
          tx.task.update({ where: { id: other.id }, data: { position: positions[index] }, select: { id: true } })
        )
      );
    }
    const position = positionBetween(at(aboveIndex), at(aboveIndex + 1));

    const columnChanged = target.id !== task.columnId;
    // In the done column: keep the original completion time when only reordering there.
    const completedAt = target.isDone ? (columnChanged ? now : (task.completedAt ?? now)) : null;
    const moved = await tx.task.update({
      where: { id: taskId },
      data: { columnId: target.id, position, completedAt },
      select: taskSelect,
    });

    if (columnChanged) {
      const from = await tx.column.findUnique({ where: { id: task.columnId }, select: { name: true } });
      await tx.activity.create({
        data: {
          projectId: task.projectId,
          actorId: userId,
          // Into the done column is a completion, one row rather than "moved" and "completed".
          action: target.isDone ? ActivityAction.TaskCompleted : ActivityAction.TaskMoved,
          taskId,
          meta: { title: task.title, from: from?.name ?? null, to: target.name },
        },
      });
    }
    return toBoardTask(moved);
  });
}

/** Deletes the task. Its activity stays (taskId becomes null); the title is kept in meta. */
export async function deleteTask(userId: string, taskId: string): Promise<DeletedResponse> {
  return prisma.$transaction(async (tx) => {
    const { task } = await requireTaskAccess(tx, userId, taskId);
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
