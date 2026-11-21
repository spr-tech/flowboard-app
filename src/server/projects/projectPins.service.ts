// Per-user preferences on a project: pins and "last opened". They change nothing anyone else
// sees, so unlike every other write they record no Activity row (docs/plan/03-data-model.md).
import type { ProjectMembershipResponse } from "@/models/responses/projectResponses";
import { prisma } from "@/server/lib/prisma";
import { membershipSelect, requireMember, toMyMembership, type Db } from "./projectAccess";

/** Opening a project writes lastOpenedAt at most this often per user and project. */
export const VISIT_WRITE_INTERVAL_MS = 60_000;

/**
 * Records that the user opened the project, unless they already did within the last minute.
 * One conditional write, no read first: refreshes inside the minute change nothing, and two tabs
 * opening at once can't both write. A non-member matches no row, so nothing happens.
 * Returns whether it wrote.
 */
export async function recordVisit(db: Db, userId: string, projectId: string, now = new Date()): Promise<boolean> {
  const { count } = await db.projectMember.updateMany({
    where: {
      userId,
      projectId,
      OR: [{ lastOpenedAt: null }, { lastOpenedAt: { lte: new Date(now.getTime() - VISIT_WRITE_INTERVAL_MS) } }],
    },
    data: { lastOpenedAt: now },
  });
  return count > 0;
}

/** Pins the project for this user. Pinning again keeps the first pin's time, so the order holds. */
export async function pinProject(
  userId: string,
  projectId: string,
  now = new Date()
): Promise<ProjectMembershipResponse> {
  return prisma.$transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    const pinned = membership.pinnedAt
      ? membership
      : await tx.projectMember.update({
          where: { userId_projectId: { userId, projectId } },
          data: { pinnedAt: now },
          select: membershipSelect,
        });
    return { projectId, ...toMyMembership(pinned) };
  });
}

export async function unpinProject(userId: string, projectId: string): Promise<ProjectMembershipResponse> {
  return prisma.$transaction(async (tx) => {
    await requireMember(tx, userId, projectId);
    const unpinned = await tx.projectMember.update({
      where: { userId_projectId: { userId, projectId } },
      data: { pinnedAt: null },
      select: membershipSelect,
    });
    return { projectId, ...toMyMembership(unpinned) };
  });
}
