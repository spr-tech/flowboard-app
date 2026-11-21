// Columns (docs/plan/04-api.md, "Columns"). Owner only. Every write runs in one transaction with
// its Activity row. A project always has exactly one done column, and tasks are completed exactly
// while they sit in it (docs/plan/03-data-model.md), so every change here keeps both true.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardColumn, DeletedResponse } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { requireOwner, type Db } from "@/server/projects/projectAccess";
import { needsRespace, positionBetween, respacedPositions } from "@/utilities/helpers/position";
import { ActivityAction } from "@/utilities/enums/activityActions";

const columnSelect = { id: true, projectId: true, name: true, position: true, isDone: true } as const;
type ColumnRow = { id: string; projectId: string; name: string; position: number; isDone: boolean };

const columnNotFound = () => new ApiError(404, "COLUMN_NOT_FOUND", "We couldn't find that column.");

/** The column, if I own its project: 404 when it doesn't exist or I'm not a member, 403 for members. */
async function requireOwnedColumn(db: Db, userId: string, columnId: string): Promise<ColumnRow> {
  const column = await db.column.findUnique({ where: { id: columnId }, select: columnSelect });
  if (!column) throw columnNotFound();
  try {
    await requireOwner(db, userId, column.projectId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) throw error;
    throw columnNotFound();
  }
  return column;
}

async function toBoardColumn(db: Db, column: ColumnRow): Promise<BoardColumn> {
  const taskCount = await db.task.count({ where: { columnId: column.id } });
  return { id: column.id, name: column.name, position: column.position, isDone: column.isDone, taskCount };
}

const logActivity = (db: Db, projectId: string, actorId: string, action: string, meta: Prisma.InputJsonObject) =>
  db.activity.create({ data: { projectId, actorId, action, meta } });

/** The project's columns, left to right. */
const columnsOf = (db: Db, projectId: string) =>
  db.column.findMany({ where: { projectId }, orderBy: { position: "asc" }, select: columnSelect });

/**
 * Makes `columnId` the done column: the old one stops being done and its tasks are no longer
 * completed; the new one's tasks are completed as of `now`. The old flag is cleared first,
 * because the partial unique index allows only one done column at any moment.
 */
async function switchDoneColumn(db: Db, projectId: string, columnId: string, now: Date) {
  const previous = await db.column.findFirst({ where: { projectId, isDone: true }, select: { id: true, name: true } });
  if (previous?.id === columnId) return previous;
  if (previous) {
    await db.column.update({ where: { id: previous.id }, data: { isDone: false }, select: { id: true } });
    await db.task.updateMany({ where: { columnId: previous.id }, data: { completedAt: null } });
  }
  await db.column.update({ where: { id: columnId }, data: { isDone: true }, select: { id: true } });
  await db.task.updateMany({ where: { columnId, completedAt: null }, data: { completedAt: now } });
  return previous;
}

/** New columns go just before the done column, so Done stays last. */
export async function createColumn(userId: string, projectId: string, input: { name: string }): Promise<BoardColumn> {
  return prisma.$transaction(async (tx) => {
    await requireOwner(tx, userId, projectId);
    let columns = await columnsOf(tx, projectId);
    let doneIndex = columns.findIndex((column) => column.isDone);
    if (doneIndex < 0) doneIndex = columns.length;
    const at = (index: number) => (index >= 0 && index < columns.length ? columns[index].position : null);

    if (needsRespace(at(doneIndex - 1), at(doneIndex))) {
      const positions = respacedPositions(columns.length);
      await Promise.all(
        columns.map((column, index) =>
          tx.column.update({ where: { id: column.id }, data: { position: positions[index] }, select: { id: true } })
        )
      );
      columns = columns.map((column, index) => ({ ...column, position: positions[index] }));
    }
    const created = await tx.column.create({
      data: { projectId, name: input.name, position: positionBetween(at(doneIndex - 1), at(doneIndex)) },
      select: columnSelect,
    });
    await logActivity(tx, projectId, userId, ActivityAction.ColumnCreated, { name: created.name });
    return { ...created, taskCount: 0 } satisfies BoardColumn;
  });
}

export type ColumnChanges = { name?: string; isDone?: true; move?: "left" | "right" };

/** Rename, move one place left or right (swapping with the neighbour), and/or become the done column. */
export async function updateColumn(
  userId: string,
  columnId: string,
  changes: ColumnChanges,
  now = new Date()
): Promise<BoardColumn> {
  return prisma.$transaction(async (tx) => {
    let column = await requireOwnedColumn(tx, userId, columnId);
    const { projectId } = column;

    if (changes.name !== undefined && changes.name !== column.name) {
      const from = column.name;
      column = await tx.column.update({ where: { id: columnId }, data: { name: changes.name }, select: columnSelect });
      await logActivity(tx, projectId, userId, ActivityAction.ColumnRenamed, { from, to: column.name });
    }

    if (changes.move) {
      const columns = await columnsOf(tx, projectId);
      const index = columns.findIndex((other) => other.id === columnId);
      const neighbour = columns[changes.move === "left" ? index - 1 : index + 1];
      if (!neighbour) {
        throw new ApiError(
          400,
          "CANNOT_MOVE",
          `This column is already the ${changes.move === "left" ? "first" : "last"}.`
        );
      }
      await tx.column.update({
        where: { id: neighbour.id },
        data: { position: column.position },
        select: { id: true },
      });
      column = await tx.column.update({
        where: { id: columnId },
        data: { position: neighbour.position },
        select: columnSelect,
      });
      await logActivity(tx, projectId, userId, ActivityAction.ColumnMoved, {
        name: column.name,
        direction: changes.move,
      });
    }

    if (changes.isDone && !column.isDone) {
      const previous = await switchDoneColumn(tx, projectId, columnId, now);
      column = { ...column, isDone: true };
      await logActivity(tx, projectId, userId, ActivityAction.ColumnDoneSet, {
        name: column.name,
        previous: previous?.name ?? null,
      });
    }

    return toBoardColumn(tx, column);
  });
}

export type DeleteColumnInput = { moveTasksTo: string } | { confirmName: string };

/**
 * Deletes a column, never the last one. Either its tasks move to the bottom of another column
 * (keeping their order), or, confirmed by the column's exact name, they're deleted with it.
 * Deleting the done column hands the done flag to the column the tasks went to, or else to the
 * last remaining column.
 */
export async function deleteColumn(
  userId: string,
  columnId: string,
  input: DeleteColumnInput,
  now = new Date()
): Promise<DeletedResponse> {
  return prisma.$transaction(async (tx) => {
    const column = await requireOwnedColumn(tx, userId, columnId);
    const { projectId } = column;
    const remaining = (await columnsOf(tx, projectId)).filter((other) => other.id !== columnId);
    if (remaining.length === 0) {
      throw new ApiError(400, "LAST_COLUMN", "A board needs at least one column.");
    }

    let nextDoneId = remaining[remaining.length - 1].id;
    let meta: Prisma.InputJsonObject;

    if ("moveTasksTo" in input) {
      const target = remaining.find((other) => other.id === input.moveTasksTo);
      if (!target) {
        throw new ApiError(400, "COLUMN_NOT_FOUND", "Pick another column on this board.", {
          moveTasksTo: "Pick another column on this board",
        });
      }
      const tasks = await tx.task.findMany({
        where: { columnId },
        orderBy: { position: "asc" },
        select: { id: true, completedAt: true },
      });
      const last = await tx.task.findFirst({
        where: { columnId: target.id },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      // Done afterwards if the target is the done column, or becomes it (this was the done column).
      const willBeDone = target.isDone || column.isDone;
      let position = last?.position ?? 0;
      for (const task of tasks) {
        position = positionBetween(position, null);
        await tx.task.update({
          where: { id: task.id },
          data: { columnId: target.id, position, completedAt: willBeDone ? (task.completedAt ?? now) : null },
          select: { id: true },
        });
      }
      nextDoneId = target.id;
      meta = { name: column.name, movedTo: target.name, taskCount: tasks.length };
    } else {
      if (input.confirmName !== column.name) {
        throw new ApiError(400, "NAME_MISMATCH", "The name doesn't match.", {
          confirmName: "Type the column name exactly as it's shown",
        });
      }
      const taskCount = await tx.task.count({ where: { columnId } });
      meta = { name: column.name, deletedTaskCount: taskCount };
    }

    // Deleting first also clears its done flag, so the unique index allows the new one.
    await tx.column.delete({ where: { id: columnId } });
    if (column.isDone) await switchDoneColumn(tx, projectId, nextDoneId, now);
    await logActivity(tx, projectId, userId, ActivityAction.ColumnDeleted, meta);
    return { id: columnId };
  });
}
