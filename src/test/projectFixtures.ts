// Response objects for browser-side project tests: GET /api/projects rows and memberships.
import type { MyMembership, ProjectSummary } from "@/models/responses/projectResponses";

export function myMembership(overrides: Partial<MyMembership> = {}): MyMembership {
  return {
    role: "OWNER",
    pinnedAt: null,
    lastOpenedAt: null,
    joinedAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

export function projectSummary(
  id: string,
  overrides: Partial<Omit<ProjectSummary, "me">> & { me?: Partial<MyMembership> } = {}
): ProjectSummary {
  const { me, ...rest } = overrides;
  return {
    id,
    name: `Project ${id}`,
    colour: "vermilion",
    updatedAt: "2026-11-20T10:00:00.000Z",
    taskCount: 0,
    doneCount: 0,
    overdueCount: 0,
    nextDueDate: null,
    memberCount: 1,
    members: [],
    me: myMembership(me),
    ...rest,
  };
}
