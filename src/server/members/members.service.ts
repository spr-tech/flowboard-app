// A project's members (docs/plan/04-api.md, "Members and invites"): the list, removing a member,
// and roles: promoting to manager, demoting, and a manager's switches. Invites live in
// src/server/invites.
import { Prisma } from "@/lib/generated/prisma";
import type { MemberRoleResponse, RemoveMemberResponse } from "@/models/responses/memberResponses";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { transaction } from "@/server/lib/transaction";
import {
  assertCan,
  permissionContext,
  permissionsOf,
  requireMember,
  sortByRole,
  type Db,
} from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { DEFAULT_MANAGER_PERMISSIONS, MANAGER_LIMIT, type ManagerPermissions } from "@/utilities/helpers/permissions";

const memberNotFound = () => new ApiError(404, "MEMBER_NOT_FOUND", "That person isn't a member of this project.");

/** The person an owner or manager acts on, or 404. */
async function requireTarget(db: Db, projectId: string, memberId: string) {
  const member = await db.projectMember.findUnique({
    where: { userId_projectId: { userId: memberId, projectId } },
    select: { role: true, permissions: true, user: { select: { name: true, email: true } } },
  });
  if (!member) throw memberNotFound();
  return { ...member, displayName: member.user.name?.trim() || member.user.email };
}

/**
 * The owner removes anyone but themselves; a manager with removeMembers removes members only.
 * Their tasks here become unassigned (and stop counting as taken), the membership goes, and a
 * member.removed row is written, all in one transaction.
 */
export async function removeMember(userId: string, projectId: string, memberId: string): Promise<RemoveMemberResponse> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    const member = await requireTarget(tx, projectId, memberId);
    if (member.role === "OWNER") {
      throw new ApiError(400, "CANNOT_REMOVE_OWNER", "The owner can't be removed from their own project.");
    }
    assertCan("member.remove", permissionContext(userId, membership, { target: { role: member.role } }));

    const { count } = await tx.task.updateMany({
      where: { projectId, assigneeId: memberId },
      data: { assigneeId: null, takenFromPoolAt: null },
    });
    await tx.projectMember.delete({ where: { userId_projectId: { userId: memberId, projectId } } });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: ActivityAction.MemberRemoved,
        meta: { userId: memberId, name: member.displayName, unassignedTaskCount: count },
      },
    });
    return { projectId, userId: memberId, unassignedTaskCount: count };
  });
}

/** Everyone on the project (owner, then managers, then members) with how many tasks each has here. */
export async function listMembers(userId: string, projectId: string): Promise<ProjectMemberResponse[]> {
  await requireMember(prisma, userId, projectId);

  const [members, assigned] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      select: {
        role: true,
        permissions: true,
        joinedAt: true,
        user: { select: { id: true, name: true, email: true, image: true } },
      },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { projectId, assigneeId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return sortByRole(members).map((member) => ({
    ...member.user,
    role: member.role,
    permissions: permissionsOf(member),
    taskCount: assigned.find((row) => row.assigneeId === member.user.id)?._count._all ?? 0,
  }));
}

/** Holds the project row until the transaction ends, so two promotions can't both pass the limit. */
async function lockProject(db: Db, projectId: string) {
  await db.$executeRaw`SELECT 1 FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
}

/**
 * Owner only. Promote a member to manager (with the default switches; at most 3 managers, else
 * 409 MANAGER_LIMIT) or demote a manager to member (their switches are cleared). The owner's own
 * role never changes. No change, no write.
 */
export async function setMemberRole(
  userId: string,
  projectId: string,
  memberId: string,
  role: "MANAGER" | "MEMBER"
): Promise<MemberRoleResponse> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    assertCan("member.changeRole", permissionContext(userId, membership));
    await lockProject(tx, projectId);
    const member = await requireTarget(tx, projectId, memberId);
    if (member.role === "OWNER") {
      throw new ApiError(400, "CANNOT_CHANGE_OWNER_ROLE", "The owner's role can't be changed.");
    }
    if (member.role === role) {
      return { projectId, userId: memberId, role, permissions: permissionsOf(member) };
    }
    if (role === "MANAGER") {
      const managers = await tx.projectMember.count({ where: { projectId, role: "MANAGER" } });
      if (managers >= MANAGER_LIMIT) {
        throw new ApiError(
          409,
          "MANAGER_LIMIT",
          `A project can have at most ${MANAGER_LIMIT} managers. Make one of them a member first.`
        );
      }
    }

    const permissions = role === "MANAGER" ? DEFAULT_MANAGER_PERMISSIONS : null;
    await tx.projectMember.update({
      where: { userId_projectId: { userId: memberId, projectId } },
      data: { role, permissions: permissions ?? Prisma.DbNull },
      select: { userId: true },
    });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: role === "MANAGER" ? ActivityAction.MemberPromoted : ActivityAction.MemberDemoted,
        meta: { userId: memberId, name: member.displayName },
      },
    });
    return { projectId, userId: memberId, role, permissions };
  });
}

/** Owner only: turn a manager's switches on or off. Writes only what changed. */
export async function setManagerPermissions(
  userId: string,
  projectId: string,
  memberId: string,
  changes: Partial<ManagerPermissions>
): Promise<MemberRoleResponse> {
  return transaction(async (tx) => {
    const membership = await requireMember(tx, userId, projectId);
    assertCan("manager.editPermissions", permissionContext(userId, membership));
    const member = await requireTarget(tx, projectId, memberId);
    if (member.role !== "MANAGER") {
      throw new ApiError(400, "NOT_A_MANAGER", "Only managers have permissions to change. Make them a manager first.");
    }

    const current = permissionsOf(member) as ManagerPermissions;
    const changed = Object.fromEntries(
      Object.entries(changes).filter(
        ([key, value]) => value !== undefined && current[key as keyof ManagerPermissions] !== value
      )
    ) as Partial<ManagerPermissions>;
    if (Object.keys(changed).length === 0) {
      return { projectId, userId: memberId, role: "MANAGER", permissions: current };
    }

    const permissions = { ...current, ...changed };
    await tx.projectMember.update({
      where: { userId_projectId: { userId: memberId, projectId } },
      data: { permissions },
      select: { userId: true },
    });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: ActivityAction.ManagerPermissionsChanged,
        meta: { userId: memberId, name: member.displayName, changes: changed },
      },
    });
    return { projectId, userId: memberId, role: "MANAGER", permissions };
  });
}
