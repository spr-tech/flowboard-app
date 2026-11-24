// A member's own card order inside a column (docs/plan/03-data-model.md, "Card order"). Personal,
// like the column order: it changes nothing anyone else sees, so it writes no Activity row. The
// owner, and managers allowed to change the team task order, have none: their drags change the
// team order (PATCH /api/tasks/:taskId/move). Resetting is DELETE .../column-order, which clears
// both personal orders.
import type { CardOrderResponse } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { transaction } from "@/server/lib/transaction";
import { permissionContext, requireMember } from "@/server/projects/projectAccess";
import { toCardOrder } from "@/utilities/helpers/cardOrder";
import { usesTeamCardOrder } from "@/utilities/helpers/permissions";

/** Saves my top-to-bottom order for one column. Every id must be a task in that column. */
export async function setCardOrder(
  userId: string,
  projectId: string,
  columnId: string,
  taskIds: string[]
): Promise<CardOrderResponse> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    if (usesTeamCardOrder(permissionContext(userId, membership))) {
      throw new ApiError(400, "USES_TEAM_ORDER", "Your card moves change the team order for everyone.");
    }
    const known = await tx.task.count({ where: { projectId, columnId, id: { in: taskIds } } });
    if (known !== taskIds.length) {
      throw new ApiError(
        400,
        "UNKNOWN_TASK",
        "That order lists a card that isn't in this column. Refresh and try again.",
        { taskIds: "Use only this column's cards" }
      );
    }
    const mine = await tx.projectMember.findUniqueOrThrow({
      where: { userId_projectId: { userId, projectId } },
      select: { cardOrder: true },
    });
    const cardOrder = { ...(toCardOrder(mine.cardOrder) ?? {}), [columnId]: taskIds };
    await tx.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      data: { cardOrder },
      select: { userId: true },
    });
    return { projectId, cardOrder };
  });
}
