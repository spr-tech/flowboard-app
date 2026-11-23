// Who may do what in a project. Every project-scoped service starts with requireMember, so
// non-members get 404 (they learn nothing about the project, not even that it exists). What a
// member may then do is decided by can() (src/utilities/helpers/permissions.ts), the same helper
// the browser uses; assertCan turns a "no" into the 403 the browser shows.
import type { Prisma } from "@/lib/generated/prisma";
import type { MyMembership, ProjectRole } from "@/models/responses/projectResponses";
import { parseManagerPermissions } from "@/models/validations/memberValidation";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { can, type PermissionAction, type PermissionContext } from "@/utilities/helpers/permissions";

/** The client itself or a transaction (`tx`), so these work inside $transaction too. */
export type Db = typeof prisma | Prisma.TransactionClient;

export const projectNotFound = () => new ApiError(404, "PROJECT_NOT_FOUND", "We couldn't find that project.");

export const ownerOnly = () => new ApiError(403, "OWNER_ONLY", "Only the project owner can do that.");

export const membershipSelect = {
  role: true,
  pinnedAt: true,
  lastOpenedAt: true,
  joinedAt: true,
  permissions: true,
} as const;

export type Membership = Prisma.ProjectMemberGetPayload<{ select: typeof membershipSelect }>;

/** A manager's switches; null for the owner and members. */
export const permissionsOf = (membership: { role: ProjectRole; permissions?: Prisma.JsonValue }) =>
  membership.role === "MANAGER" ? parseManagerPermissions(membership.permissions) : null;

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

/** The context can() needs, from my membership and whatever else the action is about. */
export function permissionContext(
  userId: string,
  membership: Pick<Membership, "role" | "permissions">,
  extra: Omit<PermissionContext, "me" | "membership"> & { takenOpenCount?: number } = {}
): PermissionContext {
  const { takenOpenCount, ...rest } = extra;
  return {
    me: { id: userId },
    membership: { role: membership.role, permissions: permissionsOf(membership), takenOpenCount },
    ...rest,
  };
}

const OWNER_ONLY_ACTIONS: readonly PermissionAction[] = [
  "member.changeRole",
  "manager.editPermissions",
  "project.editSettings",
  "project.delete",
];

/** The error code for a refused action: tasks and notes, owner-only settings, or anything else. */
function forbiddenCode(action: PermissionAction) {
  if (action.startsWith("task.") || action.startsWith("note.")) return "TASK_FORBIDDEN";
  if (OWNER_ONLY_ACTIONS.includes(action)) return "OWNER_ONLY";
  return "FORBIDDEN";
}

/** can(), or a 403 with can()'s reason as the message. */
export function assertCan(action: PermissionAction, ctx: PermissionContext): void {
  const result = can(action, ctx);
  if (!result.allowed) throw new ApiError(403, forbiddenCode(action), result.reason);
}

const ROLE_RANK: Record<ProjectRole, number> = { OWNER: 0, MANAGER: 1, MEMBER: 2 };

/**
 * Owner first, then managers, then members, each by when they joined. Done in code: Postgres
 * appended MANAGER to the enum after MEMBER, so ordering by role in SQL would put managers last.
 */
export function sortByRole<T extends { role: ProjectRole; joinedAt?: Date }>(members: readonly T[]): T[] {
  return [...members].sort(
    (a, b) => ROLE_RANK[a.role] - ROLE_RANK[b.role] || (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0)
  );
}

/** The membership as the browser sees it (ISO dates, a manager's switches). */
export function toMyMembership(membership: Membership): MyMembership {
  return {
    role: membership.role,
    permissions: permissionsOf(membership),
    pinnedAt: membership.pinnedAt?.toISOString() ?? null,
    lastOpenedAt: membership.lastOpenedAt?.toISOString() ?? null,
    joinedAt: membership.joinedAt.toISOString(),
  };
}
