// A project's members (docs/plan/04-api.md, "Members and invites"): the list (milestone 5) and
// removing a member (milestone 7). Invites live in src/server/invites.
import type { RemoveMemberResponse } from "@/models/responses/memberResponses";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { transaction } from "@/server/lib/transaction";
import { requireMember, requireOwner } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";

/**
 * The owner removes a member: their tasks in this project become unassigned, the membership
 * goes, and a member.removed row is written, all in one transaction. Never the owner.
 */
export async function removeMember(userId: string, projectId: string, memberId: string): Promise<RemoveMemberResponse> {
  return transaction(async (tx) => {
    await requireOwner(tx, userId, projectId);
    const member = await tx.projectMember.findUnique({
      where: { userId_projectId: { userId: memberId, projectId } },
      select: { role: true, user: { select: { name: true, email: true } } },
    });
    if (!member) throw new ApiError(404, "MEMBER_NOT_FOUND", "That person isn't a member of this project.");
    if (member.role === "OWNER") {
      throw new ApiError(400, "CANNOT_REMOVE_OWNER", "The owner can't be removed from their own project.");
    }

    const { count } = await tx.task.updateMany({
      where: { projectId, assigneeId: memberId },
      data: { assigneeId: null },
    });
    await tx.projectMember.delete({ where: { userId_projectId: { userId: memberId, projectId } } });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: ActivityAction.MemberRemoved,
        meta: { userId: memberId, name: member.user.name?.trim() || member.user.email, unassignedTaskCount: count },
      },
    });
    return { projectId, userId: memberId, unassignedTaskCount: count };
  });
}

/** Everyone on the project, owner first, with how many tasks each has here. Members only (else 404). */
export async function listMembers(userId: string, projectId: string): Promise<ProjectMemberResponse[]> {
  await requireMember(prisma, userId, projectId);

  const [members, assigned] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      select: { role: true, user: { select: { id: true, name: true, email: true, image: true } } },
    }),
    prisma.task.groupBy({
      by: ["assigneeId"],
      where: { projectId, assigneeId: { not: null } },
      _count: { _all: true },
    }),
  ]);

  return members.map(({ role, user }) => ({
    ...user,
    role,
    taskCount: assigned.find((row) => row.assigneeId === user.id)?._count._all ?? 0,
  }));
}
