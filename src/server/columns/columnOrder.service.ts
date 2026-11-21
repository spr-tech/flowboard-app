// A member's own column order (docs/plan/03-data-model.md, "Column order"). Personal, like pins:
// it changes nothing anyone else sees, so it writes no Activity row. The owner has no personal
// order; the owner's drags change the team order (moveColumn).
import { Prisma } from "@/lib/generated/prisma";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { requireMember } from "@/server/projects/projectAccess";

export type ColumnOrderResponse = { projectId: string; columnOrder: string[] | null };

const ownerUsesTeamOrder = () =>
  new ApiError(400, "OWNER_USES_TEAM_ORDER", "As the owner, your column moves change the team order.");

/** Saves my left-to-right order. Every id must be a column of this project (each at most once). */
export async function setColumnOrder(
  userId: string,
  projectId: string,
  columnIds: string[]
): Promise<ColumnOrderResponse> {
  return prisma.$transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    if (membership.role === "OWNER") throw ownerUsesTeamOrder();
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

/** Back to the team order. */
export async function resetColumnOrder(userId: string, projectId: string): Promise<ColumnOrderResponse> {
  return prisma.$transaction(async (tx) => {
    await requireMember(tx, userId, projectId);
    await tx.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      // Prisma writes SQL NULL into a Json column with DbNull.
      data: { columnOrder: Prisma.DbNull },
      select: { userId: true },
    });
    return { projectId, columnOrder: null };
  });
}
