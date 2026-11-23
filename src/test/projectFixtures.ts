// Response objects for browser-side project tests: GET /api/projects rows and memberships.
import type { BoardTask } from "@/models/responses/boardResponses";
import type {
  MyBoardMembership,
  MyMembership,
  ProjectColumnSummary,
  ProjectDetail,
  ProjectSummary,
} from "@/models/responses/projectResponses";

export function myMembership(overrides: Partial<MyMembership> = {}): MyMembership {
  return {
    role: "OWNER",
    permissions: null,
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
    description: null,
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

/** My membership on a board: role, pin, last opened, and my own column order (null = team order). */
export function boardMembership(overrides: Partial<MyBoardMembership> = {}): MyBoardMembership {
  return { ...myMembership(), columnOrder: null, cardOrder: null, takenOpenCount: 0, ...overrides };
}

/** A column as GET /api/projects/:projectId returns it. Demo added it unless said otherwise. */
export function boardColumn(
  id: string,
  name: string,
  position: number,
  overrides: Partial<ProjectColumnSummary> = {}
): ProjectColumnSummary {
  return {
    id,
    name,
    position,
    isDone: false,
    taskCount: 0,
    createdBy: { id: "demo", name: "Alex Morgan" },
    createdAt: "2026-11-01T10:00:00.000Z",
    ...overrides,
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
    createdById: "demo",
    takenFromPool: false,
    newForOwner: false,
    ...overrides,
  };
}

/** A board: To do, In progress, Done (the done column), with the given tasks. Demo is the owner. */
export function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  const columns = [
    boardColumn("todo", "To do", 1000),
    boardColumn("doing", "In progress", 2000),
    boardColumn("done", "Done", 3000, { isDone: true }),
  ];
  return {
    id: "p1",
    name: "Website relaunch",
    description: null,
    colour: "vermilion",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-20T10:00:00.000Z",
    taskCount: 0,
    columns,
    tasks: [],
    members: [
      { id: "demo", name: "Alex Morgan", image: null, role: "OWNER", permissions: null },
      { id: "sam", name: "Sam Rivera", image: null, role: "MEMBER", permissions: null },
    ],
    memberTakeLimit: 5,
    me: boardMembership(),
    ...overrides,
  };
}
