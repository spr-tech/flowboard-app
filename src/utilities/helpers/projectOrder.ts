// The ordering rules for project lists (docs/plan/03-data-model.md, "Pinning" and "Sidebar").
// Pure functions over the GET /api/projects list, so they're tested without a store or a screen.
import type { MyMembership } from "@/models/responses/projectResponses";

type Orderable = { updatedAt: string; me: MyMembership };

export const PROJECT_FILTERS = ["all", "owned", "shared"] as const;
export type ProjectFilter = (typeof PROJECT_FILTERS)[number];

/** How many projects the sidebar's "Your projects" shows. */
export const SIDEBAR_PROJECT_LIMIT = 3;

/** ?filter= from the URL; anything unknown means "all". */
export function toProjectFilter(value: string | undefined): ProjectFilter {
  return PROJECT_FILTERS.find((filter) => filter === value) ?? "all";
}

export function filterProjects<T extends Orderable>(projects: readonly T[], filter: ProjectFilter): T[] {
  if (filter === "owned") return projects.filter((project) => project.me.role === "OWNER");
  if (filter === "shared") return projects.filter((project) => project.me.role === "MEMBER");
  return [...projects];
}

/** ISO strings of the same format sort the same as the dates they hold. */
const oldestFirst = (a: string, b: string) => a.localeCompare(b);
const newestFirst = (a: string, b: string) => b.localeCompare(a);

/** My pinned projects, oldest pin first. */
function pinnedInPinOrder<T extends Orderable>(projects: readonly T[]): T[] {
  return projects
    .filter((project) => project.me.pinnedAt !== null)
    .sort((a, b) => oldestFirst(a.me.pinnedAt ?? "", b.me.pinnedAt ?? ""));
}

/** Projects page: pinned first in pin order, then the rest by "updated", newest first. */
export function sortForProjectsPage<T extends Orderable>(projects: readonly T[]): T[] {
  const rest = projects
    .filter((project) => project.me.pinnedAt === null)
    .sort((a, b) => newestFirst(a.updatedAt, b.updatedAt));
  return [...pinnedInPinOrder(projects), ...rest];
}

/** When I last opened the project; a project I've never opened counts from when I joined. */
const lastOpened = (project: Orderable) => project.me.lastOpenedAt ?? project.me.joinedAt;

/**
 * Sidebar "Your projects": pinned first (oldest pin first), then the projects I opened most
 * recently fill the remaining slots. Each project appears once. Never more than `limit`.
 */
export function selectSidebarProjects<T extends Orderable>(
  projects: readonly T[],
  limit: number = SIDEBAR_PROJECT_LIMIT
): T[] {
  const recent = projects
    .filter((project) => project.me.pinnedAt === null)
    .sort((a, b) => newestFirst(lastOpened(a), lastOpened(b)));
  return [...pinnedInPinOrder(projects), ...recent].slice(0, limit);
}

/**
 * The project I opened most recently (pinned or not); one I've never opened counts from when I
 * joined. The dashboard's "Open a board" goes here. Null when I have no projects.
 */
export function mostRecentlyOpened<T extends Orderable>(projects: readonly T[]): T | null {
  return projects.reduce<T | null>(
    (best, project) => (best === null || newestFirst(lastOpened(project), lastOpened(best)) < 0 ? project : best),
    null
  );
}

/** How many of my projects are pinned (the toast after a pin says whether it reached the sidebar). */
export function countPinned(projects: readonly Orderable[]): number {
  return projects.filter((project) => project.me.pinnedAt !== null).length;
}
