// Columns (docs/plan/04-api.md, "Columns"). Every write runs in one transaction with its Activity
// row. A project always has exactly one done column, and tasks are completed exactly while they
// sit in it (docs/plan/03-data-model.md), so every change here keeps both true.
//
// Who may do what (docs/plan/01-product-and-flows.md, "Columns"):
// - The owner can always add, rename, move (team order), set done and delete.
// - Members may add columns while membersCanAddColumns is on, until the project's member-created
//   columns reach memberColumnLimit (for all members together), and rename the ones they added.
import type { Prisma } from "@/lib/generated/prisma";
import type { BoardColumn, DeletedResponse } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { ownerOnly, requireMember, type Db, type Membership } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { aboveIndexFor, placeAt, positionBetween } from "@/utilities/helpers/position";

const columnSelect = {
  id: true,
  projectId: true,
  name: true,
  position: true,
  isDone: true,
  createdById: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;
type ColumnRow = Prisma.ColumnGetPayload<{ select: typeof columnSelect }>;

const columnNotFound = () => new ApiError(404, "COLUMN_NOT_FOUND", "We couldn't find that column.");

/** The column and whether I own its project: 404 when it doesn't exist or I'm not a member. */
async function requireColumnAccess(db: Db, userId: string, columnId: string) {
  const column = await db.column.findUnique({ where: { id: columnId }, select: columnSelect });
  if (!column) throw columnNotFound();
  let membership: Membership;
  try {
    membership = await requireMember(db, userId, column.projectId);
  } catch {
    throw columnNotFound();
  }
  return { column, isOwner: membership.role === "OWNER" };
}

async function toBoardColumn(db: Db, column: ColumnRow): Promise<BoardColumn> {
  const taskCount = await db.task.count({ where: { columnId: column.id } });
  return {
    id: column.id,
    name: column.name,
    position: column.position,
    isDone: column.isDone,
    taskCount,
    createdBy: column.createdBy,
    createdAt: column.createdAt.toISOString(),
  };
}

const logActivity = (db: Db, projectId: string, actorId: string, action: string, meta: Prisma.InputJsonObject) =>
  db.activity.create({ data: { projectId, actorId, action, meta } });

/** The project's columns in the team order (left to right). */
const columnsOf = (db: Db, projectId: string) =>
  db.column.findMany({ where: { projectId }, orderBy: { position: "asc" }, select: columnSelect });

/** Writes fresh positions for the whole team order, when a gap got too small to split. */
const writePositions = (db: Db, columns: { id: string }[], positions: number[]) =>
  Promise.all(
    columns.map((column, index) =>
      db.column.update({ where: { id: column.id }, data: { position: positions[index] }, select: { id: true } })
    )
  );

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

/**
 * May this member add a column? The owner always may. A member needs the switch on, and the
 * project's member-created columns (any creator other than the owner) under the shared limit.
 */
async function assertMayAddColumn(db: Db, projectId: string, isOwner: boolean) {
  if (isOwner) return;
  const project = await db.project.findUniqueOrThrow({
    where: { id: projectId },
    select: {
      membersCanAddColumns: true,
      memberColumnLimit: true,
      members: { where: { role: "OWNER" }, select: { userId: true } },
    },
  });
  if (!project.membersCanAddColumns) {
    throw new ApiError(403, "COLUMNS_LOCKED", "Only the owner can add columns to this board.");
  }
  const ownerId = project.members[0]?.userId;
  const used = await db.column.count({ where: { projectId, ...(ownerId ? { createdById: { not: ownerId } } : {}) } });
  if (used >= project.memberColumnLimit) {
    throw new ApiError(
      409,
      "COLUMN_LIMIT_REACHED",
      `Column limit reached (${used} of ${project.memberColumnLimit}). The owner can raise it.`
    );
  }
}

/** New columns go just before the done column in the team order. */
export async function createColumn(userId: string, projectId: string, input: { name: string }): Promise<BoardColumn> {
  return prisma.$transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    await assertMayAddColumn(tx, projectId, membership.role === "OWNER");

    const columns = await columnsOf(tx, projectId);
    const doneIndex = columns.findIndex((column) => column.isDone);
    const aboveIndex = (doneIndex < 0 ? columns.length : doneIndex) - 1;
    const { position, respaced } = placeAt(
      columns.map((column) => column.position),
      aboveIndex
    );
    if (respaced) await writePositions(tx, columns, respaced);

    const created = await tx.column.create({
      data: { projectId, name: input.name, position, createdById: userId },
      select: columnSelect,
    });
    await logActivity(tx, projectId, userId, ActivityAction.ColumnCreated, { name: created.name });
    return { ...(await toBoardColumn(tx, created)), taskCount: 0 };
  });
}

export type ColumnChanges = { name?: string; isDone?: true };

/** Rename (the owner, or the member who added the column) and/or become the done column (owner). */
export async function updateColumn(
  userId: string,
  columnId: string,
  changes: ColumnChanges,
  now = new Date()
): Promise<BoardColumn> {
  return prisma.$transaction(async (tx) => {
    const access = await requireColumnAccess(tx, userId, columnId);
    let { column } = access;
    const { isOwner } = access;
    const { projectId } = column;
    if (changes.isDone && !isOwner) throw ownerOnly();
    if (changes.name !== undefined && !isOwner && column.createdById !== userId) {
      throw new ApiError(403, "NOT_YOUR_COLUMN", "You can rename only the columns you added.");
    }

    if (changes.name !== undefined && changes.name !== column.name) {
      const from = column.name;
      column = await tx.column.update({ where: { id: columnId }, data: { name: changes.name }, select: columnSelect });
      await logActivity(tx, projectId, userId, ActivityAction.ColumnRenamed, { from, to: column.name });
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

export type MoveColumnInput = { afterColumnId?: string; beforeColumnId?: string };

/**
 * The owner moves a column in the team order: the midpoint of its new neighbours' current
 * positions, re-spacing all of the project's columns first when the gap is too small.
 */
export async function moveColumn(userId: string, columnId: string, input: MoveColumnInput): Promise<BoardColumn> {
  return prisma.$transaction(async (tx) => {
    const { column, isOwner } = await requireColumnAccess(tx, userId, columnId);
    if (!isOwner) throw ownerOnly();

    const others = (await columnsOf(tx, column.projectId)).filter((other) => other.id !== columnId);
    const aboveIndex = aboveIndexFor(
      others.map((other) => other.id),
      input.afterColumnId,
      input.beforeColumnId
    );
    if (aboveIndex === null) {
      throw new ApiError(
        400,
        "INVALID_POSITION",
        "The board changed while you were moving that column. Refresh and try again."
      );
    }
    const { position, respaced } = placeAt(
      others.map((other) => other.position),
      aboveIndex
    );
    if (respaced) await writePositions(tx, others, respaced);

    const moved = await tx.column.update({ where: { id: columnId }, data: { position }, select: columnSelect });
    await logActivity(tx, column.projectId, userId, ActivityAction.ColumnMoved, { name: moved.name });
    return toBoardColumn(tx, moved);
  });
}

export type DeleteColumnInput = { moveTasksTo: string } | { confirmName: string };

/**
 * Owner only. Deletes a column, never the last one. Either its tasks move to the bottom of
 * another column (keeping their order), or, confirmed by the column's exact name, they're deleted
 * with it. Deleting the done column hands the done flag to the column the tasks went to, or else
 * to the last remaining column. Personal orders that still list it simply ignore it.
 */
export async function deleteColumn(
  userId: string,
  columnId: string,
  input: DeleteColumnInput,
  now = new Date()
): Promise<DeletedResponse> {
  return prisma.$transaction(async (tx) => {
    const { column, isOwner } = await requireColumnAccess(tx, userId, columnId);
    if (!isOwner) throw ownerOnly();
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
