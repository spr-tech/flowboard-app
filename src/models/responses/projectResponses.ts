import type { BoardMember, BoardTask } from "@/models/responses/boardResponses";
import type { ManagerPermissions } from "@/utilities/helpers/permissions";
import type { ProjectColour } from "@/utilities/enums/projectColours";

export type ProjectRole = "OWNER" | "MANAGER" | "MEMBER";

/** My own membership of a project. Dates are ISO strings. */
export type MyMembership = {
  role: ProjectRole;
  /** A manager's switches, set by the owner; null for the owner and members. */
  permissions: ManagerPermissions | null;
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
  /** Optional; null when empty. */
  description: string | null;
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
  /** The team order (left to right). A member's own order is in me.columnOrder. */
  position: number;
  isDone: boolean;
  taskCount: number;
  createdBy: { id: string; name: string | null };
  createdAt: string;
};

/** Who may add columns (Settings › Columns). */
export type ColumnPermissions = {
  membersCanAddColumns: boolean;
  /** 1 to 10, for all members together. */
  memberColumnLimit: number;
  /** Columns created by someone other than the owner. */
  memberColumnCount: number;
};

/** My membership, plus my own column order (null = the team order; the owner never has one). */
export type MyBoardMembership = MyMembership & { columnOrder: string[] | null };

/** GET /api/projects/:projectId: the whole board. Also what project writes return. */
export type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  colour: ProjectColour;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  /** Left to right. */
  columns: ProjectColumnSummary[];
  /** Every task, by column then position. */
  tasks: BoardTask[];
  /** Everyone on the project (owner, managers, members): assignee options and header avatars. */
  members: BoardMember[];
  /** How many open tasks a member may take from the unassigned pool (1 to 20). */
  memberTakeLimit: number;
  columnPermissions: ColumnPermissions;
  me: MyBoardMembership;
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
  /** A manager's switches; null for the owner and members. */
  permissions: ManagerPermissions | null;
  /** Tasks assigned to this member in this project. */
  taskCount: number;
};
