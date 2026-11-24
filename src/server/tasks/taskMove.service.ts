// Moving a card (docs/plan/04-api.md, "Moving a task"). Two kinds of mover:
// - The owner, and managers allowed to change the team task order: the card lands exactly where
//   it was dropped, in the team order everyone sees.
// - Everyone else (members, and managers without that switch) works in their own card order. A
//   move to another column (only tasks they may move: for members, tasks assigned to them) lands
//   at the TOP of that column's team order, so whoever watches the column sees it first, and
//   where they dropped it in their own order. Reordering within a column is
//   PUT /api/projects/:projectId/card-order, never this route.
import type { BoardTask } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { transaction } from "@/server/lib/transaction";
import { assertCan, type Db } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { toCardOrder, orderCards, withCardPlaced } from "@/utilities/helpers/cardOrder";
import { usesTeamCardOrder } from "@/utilities/helpers/permissions";
import { aboveIndexFor, placeAt } from "@/utilities/helpers/position";
import { requireTaskAccess, taskContext, taskSelect, toBoardTask } from "./taskShape";
import { requireColumn } from "./tasks.service";

export type MoveInput = { columnId: string; afterTaskId?: string; beforeTaskId?: string };

const badNeighbour = () =>
  new ApiError(400, "INVALID_POSITION", "The board changed while you were moving that card. Refresh and try again.");

/** Writes fresh positions for a column's cards when the gap got too small. */
async function writeRespaced(db: Db, others: { id: string }[], respaced: number[] | null) {
  if (!respaced) return;
  await Promise.all(
    others.map((other, index) =>
      db.task.update({ where: { id: other.id }, data: { position: respaced[index] }, select: { id: true } })
    )
  );
}

/**
 * Moves a card (one transaction): checks the mover may, the column and the neighbours, computes
 * the position on the server (re-spacing the column if the gap is too small), keeps a personal
 * mover's own order, sets or clears completedAt, and writes one Activity row when the column
 * changed.
 */
export async function moveTask(userId: string, taskId: string, input: MoveInput, now = new Date()): Promise<BoardTask> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    const ctx = taskContext(userId, membership, task);
    const target = await requireColumn(tx, task.projectId, input.columnId);
    const columnChanged = target.id !== task.columnId;
    const team = usesTeamCardOrder(ctx);

    if (columnChanged) assertCan("task.move", ctx);
    else if (!team) assertCan("task.reorderTeam", ctx);

    // The target column's other cards, in the team order.
    const others = await tx.task.findMany({
      where: { columnId: target.id, id: { not: taskId } },
      orderBy: { position: "asc" },
      select: { id: true, position: true },
    });
    const positions = others.map((other) => other.position);

    let placed: ReturnType<typeof placeAt>;
    if (team) {
      const aboveIndex = aboveIndexFor(
        others.map((other) => other.id),
        input.afterTaskId,
        input.beforeTaskId
      );
      if (aboveIndex === null) throw badNeighbour();
      placed = placeAt(positions, aboveIndex);
    } else {
      // The neighbours are in my own order; the team order gets the card at the top.
      const mine = await tx.projectMember.findUniqueOrThrow({
        where: { userId_projectId: { userId, projectId: task.projectId } },
        select: { cardOrder: true },
      });
      const stored = toCardOrder(mine.cardOrder);
      const myOthers = orderCards(others, stored?.[target.id]).map((other) => other.id);
      const aboveIndex = aboveIndexFor(myOthers, input.afterTaskId, input.beforeTaskId);
      if (aboveIndex === null) throw badNeighbour();
      await tx.projectMember.update({
        where: { userId_projectId: { userId, projectId: task.projectId } },
        data: {
          cardOrder: withCardPlaced(stored, myOthers, {
            taskId,
            index: aboveIndex + 1,
            toColumnId: target.id,
            fromColumnId: task.columnId,
          }),
        },
        select: { userId: true },
      });
      placed = placeAt(positions, -1);
    }
    await writeRespaced(tx, others, placed.respaced);

    // In the done column: keep the original completion time when only reordering there.
    const completedAt = target.isDone ? (columnChanged ? now : (task.completedAt ?? now)) : null;
    const moved = await tx.task.update({
      where: { id: taskId },
      data: { columnId: target.id, position: placed.position, completedAt },
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
