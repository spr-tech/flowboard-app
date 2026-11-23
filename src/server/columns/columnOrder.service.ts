// A member's own column order (docs/plan/03-data-model.md, "Column order"). Personal, like pins:
// it changes nothing anyone else sees, so it writes no Activity row. The owner, and managers with
// manageColumns, have no personal order: their drags change the team order (moveColumn).
import { Prisma } from "@/lib/generated/prisma";
import { ApiError } from "@/server/lib/errors";
import { transaction } from "@/server/lib/transaction";
import { permissionContext, requireMember } from "@/server/projects/projectAccess";
import { usesTeamColumnOrder } from "@/utilities/helpers/permissions";

export type ColumnOrderResponse = { projectId: string; columnOrder: string[] | null };

const usesTeamOrder = () =>
  new ApiError(400, "USES_TEAM_ORDER", "Your column moves change the team order for everyone.");

/** Saves my left-to-right order. Every id must be a column of this project (each at most once). */
export async function setColumnOrder(
  userId: string,
  projectId: string,
  columnIds: string[]
): Promise<ColumnOrderResponse> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    if (usesTeamColumnOrder(permissionContext(userId, membership))) throw usesTeamOrder();
    const known = await tx.column.count({ where: { projectId, id: { in: columnIds } } });
    if (known !== columnIds.length) {
      throw new ApiError(
        400,
        "UNKNOWN_COLUMN",
        "That order lists a column that isn't on this board. Refresh and try again.",
        {
          columnIds: "Use only this board's columns",
        }
      );
    }
    await tx.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      data: { columnOrder: columnIds },
      select: { userId: true },
    });
    return { projectId, columnOrder: columnIds };
  });
}

/** Back to the team order, for my columns and my cards. */
export async function resetColumnOrder(userId: string, projectId: string): Promise<ColumnOrderResponse> {
  return transaction(async (tx) => {
    await requireMember(tx, userId, projectId);
    await tx.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      // Prisma writes SQL NULL into a Json column with DbNull.
      data: { columnOrder: Prisma.DbNull, cardOrder: Prisma.DbNull },
      select: { userId: true },
    });
    return { projectId, columnOrder: null };
  });
}
