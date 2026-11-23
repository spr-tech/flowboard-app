import type { ManagerPermissions } from "@/utilities/helpers/permissions";

import type { ProjectRole } from "./projectResponses";

// The board: tasks and the people they can be assigned to (GET /api/projects/:projectId).
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type BoardPerson = { id: string; name: string | null; image: string | null };

/** One card. Dates are ISO strings, except dueDate, a calendar day (YYYY-MM-DD). */
export type BoardTask = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  /** Order within the column. Computed only by the server. */
  position: number;
  dueDate: string | null;
  assignee: BoardPerson | null;
  /** Set while the task is in the done column. */
  completedAt: string | null;
  createdAt: string;
  /** Who created it: members may edit and delete the tasks they created. */
  createdById: string;
  /** The assignee took it from the unassigned pool ("Assign to me"). */
  takenFromPool: boolean;
  /** Created by a member and not yet opened by the owner: the owner sees a "New" badge. */
  newForOwner: boolean;
};

/** Someone on the project, with a manager's switches (null for the owner and members). */
export type BoardMember = BoardPerson & { role: ProjectRole; permissions: ManagerPermissions | null };

/** A column as the column endpoints return it. */
export type BoardColumn = {
  id: string;
  name: string;
  position: number;
  isDone: boolean;
  taskCount: number;
  createdBy: { id: string; name: string | null };
  createdAt: string;
};

/** DELETE /api/tasks/:taskId and DELETE /api/columns/:columnId. */
export type DeletedResponse = { id: string };

/** A note under a task's description. Never edited; the author or the owner may delete it. */
export type TaskNoteResponse = {
  id: string;
  taskId: string;
  body: string;
  createdAt: string;
  author: BoardPerson;
};

/** PUT and DELETE (reset) of my personal orders. Null = the team order. */
export type CardOrder = Record<string, string[]>;
export type CardOrderResponse = { projectId: string; cardOrder: CardOrder | null };
