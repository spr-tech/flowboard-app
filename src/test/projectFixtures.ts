// Response objects for browser-side project tests: GET /api/projects rows and memberships.
import type { BoardTask } from "@/models/responses/boardResponses";
import type { MyMembership, ProjectDetail, ProjectSummary } from "@/models/responses/projectResponses";

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

export function boardTask(id: string, overrides: Partial<BoardTask> = {}): BoardTask {
  return {
    id,
    columnId: "todo",
    title: `Task ${id}`,
    description: null,
    priority: "MEDIUM",
    position: 1000,
    dueDate: null,
    assignee: null,
    completedAt: null,
    createdAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
  };
}

/** A board: To do, In progress, Done (the done column), with the given tasks. Demo is the owner. */
export function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  const columns = [
    { id: "todo", name: "To do", position: 1000, isDone: false, taskCount: 0 },
    { id: "doing", name: "In progress", position: 2000, isDone: false, taskCount: 0 },
    { id: "done", name: "Done", position: 3000, isDone: true, taskCount: 0 },
  ];
  return {
    id: "p1",
    name: "Website relaunch",
    colour: "vermilion",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    taskCount: 0,
    columns,
    tasks: [],
    members: [
      { id: "demo", name: "Alex Morgan", image: null, role: "OWNER" },
      { id: "sam", name: "Sam Rivera", image: null, role: "MEMBER" },
    ],
    me: myMembership(),
    ...overrides,
  };
}
