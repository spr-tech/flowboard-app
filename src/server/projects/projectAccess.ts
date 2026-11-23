// Who may do what in a project. Every project-scoped service starts with one of these, so the
// rules live in one place: non-members get 404 (they learn nothing about the project, not even
// that it exists), members who try an owner-only action get 403.
import type { Prisma } from "@/lib/generated/prisma";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";

/** The client itself or a transaction (`tx`), so these work inside $transaction too. */
export type Db = typeof prisma | Prisma.TransactionClient;

export const projectNotFound = () => new ApiError(404, "PROJECT_NOT_FOUND", "We couldn't find that project.");

export const ownerOnly = () => new ApiError(403, "OWNER_ONLY", "Only the project owner can do that.");

export const membershipSelect = { role: true, pinnedAt: true, lastOpenedAt: true, joinedAt: true } as const;

export type Membership = Prisma.ProjectMemberGetPayload<{ select: typeof membershipSelect }>;

/** My membership of the project, or 404. */
export async function requireMember(db: Db, userId: string, projectId: string): Promise<Membership> {
  const membership = await db.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: membershipSelect,
  });
  if (!membership) throw projectNotFound();
  return membership;
}

/** My membership, or 404 for non-members and 403 for members who aren't the owner. */
export async function requireOwner(db: Db, userId: string, projectId: string): Promise<Membership> {
  const membership = await requireMember(db, userId, projectId);
  if (membership.role !== "OWNER") throw ownerOnly();
  return membership;
}

/** The membership as the browser sees it (ISO dates). */
export function toMyMembership(membership: Membership) {
  return {
    role: membership.role,
    pinnedAt: membership.pinnedAt?.toISOString() ?? null,
    lastOpenedAt: membership.lastOpenedAt?.toISOString() ?? null,
    joinedAt: membership.joinedAt.toISOString(),
  };
}
