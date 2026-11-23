import { prisma } from "@/server/lib/prisma";

/**
 * The project's name, for the page title, or null when it doesn't exist or I'm not a member.
 * Both are null on purpose: as with the API's 404s, a page never reveals that a project exists.
 */
export async function findProjectName(userId: string, projectId: string): Promise<string | null> {
  const membership = await prisma.projectMember.findUnique({
    where: { userId_projectId: { userId, projectId } },
    select: { project: { select: { name: true } } },
  });
  return membership?.project.name ?? null;
}
