// A project's members (docs/plan/04-api.md, "Members and invites"). Milestone 5 builds the
// read-only list; milestone 7 adds removing members and invites.
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { prisma } from "@/server/lib/prisma";
import { requireMember } from "@/server/projects/projectAccess";

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
