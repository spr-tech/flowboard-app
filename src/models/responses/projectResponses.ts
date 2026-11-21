import type { ProjectColour } from "@/utilities/enums/projectColours";

export type ProjectRole = "OWNER" | "MEMBER";

/** My own membership of a project. Dates are ISO strings. */
export type MyMembership = {
  role: ProjectRole;
  /** Null when not pinned. Pinned projects sort by this, oldest first. */
  pinnedAt: string | null;
  /** When I last opened the project; null if never (then joinedAt stands in). */
  lastOpenedAt: string | null;
  joinedAt: string;
};

/** POST and DELETE /api/projects/:projectId/pin. */
export type ProjectMembershipResponse = MyMembership & { projectId: string };

export type ProjectMemberPreview = { id: string; name: string | null; image: string | null };

/** One card on the projects page (GET /api/projects). */
export type ProjectSummary = {
  id: string;
  name: string;
  colour: ProjectColour;
  /** The latest of the project's own changes and its activity: "Updated 12 minutes ago". */
  updatedAt: string;
  taskCount: number;
  /** Tasks in the done column. */
  doneCount: number;
  /** Due before the `today` sent with the request, and not completed. */
  overdueCount: number;
  /** The earliest due date from `today` on, among tasks not completed; YYYY-MM-DD. */
  nextDueDate: string | null;
  memberCount: number;
  /** Up to 4, owner first. */
  members: ProjectMemberPreview[];
  me: MyMembership;
};

export type ProjectColumnSummary = {
  id: string;
  name: string;
  position: number;
  isDone: boolean;
  taskCount: number;
};

/** GET /api/projects/:projectId (milestone 6 adds the board's tasks). Also what writes return. */
export type ProjectDetail = {
  id: string;
  name: string;
  colour: ProjectColour;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  /** Left to right. */
  columns: ProjectColumnSummary[];
  me: MyMembership;
};

/** DELETE /api/projects/:projectId. */
export type DeleteProjectResponse = { id: string };

/** POST /api/projects/:projectId/leave. */
export type LeaveProjectResponse = { projectId: string; unassignedTaskCount: number };

/** GET /api/projects/:projectId/members. */
export type ProjectMemberResponse = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: ProjectRole;
  /** Tasks assigned to this member in this project. */
  taskCount: number;
};
