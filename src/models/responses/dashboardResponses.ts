// The dashboard's answers (docs/plan/04-api.md, "Dashboard"; docs/designs/app-screens.md).
// "My" means tasks assigned to me. Days are YYYY-MM-DD; moments are ISO strings.
import type { TaskPriority } from "@/models/responses/boardResponses";
import type { ProjectMemberPreview } from "@/models/responses/projectResponses";
import type { ProjectColour } from "@/utilities/enums/projectColours";

/** GET /api/dashboard/summary. */
export type DashboardSummary = {
  firstName: string | null;
  /** 0 means a new user: the page shows only "Create your first project". */
  projectCount: number;
  /** My open tasks, and how many projects they're spread over ("across 3 projects"). */
  assignedOpen: number;
  assignedProjectCount: number;
  /** Open, due today or in the next 6 days. */
  dueThisWeek: number;
  /** Open, due before today. */
  overdue: number;
  /** How late the oldest overdue task is, in days ("oldest is 2 days late"); null when none. */
  oldestOverdueDays: number | null;
  /** Completed on one of the last 7 days (today included), in the browser's zone. */
  completedThisWeek: number;
};

export type DueGroupKey = "overdue" | "today" | "week" | "later" | "none";

export type MyTask = {
  id: string;
  title: string;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  columnId: string;
  project: {
    id: string;
    name: string;
    colour: ProjectColour;
    /** Ticking the checkbox moves the task here. */
    doneColumnId: string;
    /** Unticking moves it here: the first column (team order) that isn't the done column. */
    reopenColumnId: string | null;
  };
};

/**
 * GET /api/me/tasks?group=due. Groups hold my open tasks plus those completed today (shown struck
 * through, so a ticked task stays where it was), in the order Overdue, Today, This week, Later,
 * No due date; empty groups are left out. `completedThisWeek` is for the Completed filter.
 */
export type MyTasksResponse = {
  groups: { key: DueGroupKey; tasks: MyTask[] }[];
  completedThisWeek: MyTask[];
};

/** GET /api/dashboard/projects: up to 5 progress rows, pinned first, then most recently opened. */
export type DashboardProject = {
  id: string;
  name: string;
  colour: ProjectColour;
  taskCount: number;
  doneCount: number;
  overdueCount: number;
  nextDueDate: string | null;
  members: ProjectMemberPreview[];
};

export type DayCount = { date: string; count: number };

/** GET /api/dashboard/stats. */
export type DashboardStats = {
  /** 14 days, oldest first, ending today: my tasks completed each day. */
  completedPerDay: DayCount[];
  /** My open tasks by priority. */
  openByPriority: Record<TaskPriority, number>;
  /** 7 days from today: my open tasks due each day. */
  next7Days: DayCount[];
};

/** One Activity row, as the feeds show it. `meta` is whatever the action recorded. */
export type ActivityItem = {
  id: string;
  action: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  actor: { id: string; name: string | null; image: string | null };
  project: { id: string; name: string; colour: ProjectColour };
  task: { id: string; title: string } | null;
};
