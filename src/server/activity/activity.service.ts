// Activity feeds: the dashboard's team activity (every project I'm in) and one task's history
// (the task drawer). The browser turns each row into a sentence (activitySentence.ts).
import type { ActivityItem } from "@/models/responses/dashboardResponses";
import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/server/lib/prisma";
import { requireTaskAccess } from "@/server/tasks/taskShape";

export const ACTIVITY_FEED_LIMIT = 20;

const activitySelect = {
  id: true,
  action: true,
  meta: true,
  createdAt: true,
  actor: { select: { id: true, name: true, image: true } },
  project: { select: { id: true, name: true, colour: true } },
  task: { select: { id: true, title: true } },
} as const;

type ActivityRow = Prisma.ActivityGetPayload<{ select: typeof activitySelect }>;

function toActivityItem(row: ActivityRow): ActivityItem {
  const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta) ? row.meta : null;
  return {
    id: row.id,
    action: row.action,
    meta: meta as Record<string, unknown> | null,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor,
    project: row.project,
    task: row.task,
  };
}

/** The newest 20 events across every project I'm a member of. */
export async function getTeamActivity(userId: string): Promise<ActivityItem[]> {
  const rows = await prisma.activity.findMany({
    where: { project: { members: { some: { userId } } } },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_FEED_LIMIT,
    select: activitySelect,
  });
  return rows.map(toActivityItem);
}

/** One task's newest 20 events (members only; 404 like the task otherwise). */
export async function getTaskActivity(userId: string, taskId: string): Promise<ActivityItem[]> {
  await requireTaskAccess(prisma, userId, taskId);
  const rows = await prisma.activity.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_FEED_LIMIT,
    select: activitySelect,
  });
  return rows.map(toActivityItem);
}
