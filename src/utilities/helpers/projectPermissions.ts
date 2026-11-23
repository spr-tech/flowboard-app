// can() for the browser: the same helper the server uses, fed from what the board already has
// (my membership, the project's take limit, a task, a note). Components ask these instead of
// checking roles, so a button shows exactly when the server would allow its action.
import type { BoardTask } from "@/models/responses/boardResponses";
import type { MyBoardMembership, MyMembership } from "@/models/responses/projectResponses";
import { can, type PermissionAction, type PermissionContext, type PermissionResult } from "./permissions";

export type ProjectForPermissions = {
  me: MyMembership & Partial<Pick<MyBoardMembership, "takenOpenCount">>;
  memberTakeLimit?: number;
};

type Extra = {
  task?: Pick<BoardTask, "createdById" | "assignee">;
  note?: PermissionContext["note"];
  target?: PermissionContext["target"];
};

/** can()'s context for me in this project. */
export function myContext(project: ProjectForPermissions, meId: string | null, extra: Extra = {}): PermissionContext {
  return {
    me: { id: meId ?? "" },
    membership: {
      role: project.me.role,
      permissions: project.me.permissions,
      takenOpenCount: project.me.takenOpenCount ?? 0,
    },
    project: { memberTakeLimit: project.memberTakeLimit ?? 0 },
    ...(extra.task
      ? { task: { createdById: extra.task.createdById, assigneeId: extra.task.assignee?.id ?? null } }
      : {}),
    ...(extra.note ? { note: extra.note } : {}),
    ...(extra.target ? { target: extra.target } : {}),
  };
}

export function projectCan(
  project: ProjectForPermissions,
  meId: string | null,
  action: PermissionAction,
  extra: Extra = {}
): PermissionResult {
  return can(action, myContext(project, meId, extra));
}

/** What I may do to one team column. */
export type ColumnRights = { rename: boolean; reorderTeam: boolean; setDone: boolean; delete: boolean };

export function columnRights(
  project: ProjectForPermissions,
  meId: string | null,
  column: { isDone: boolean }
): ColumnRights {
  const allowed = (action: PermissionAction) => projectCan(project, meId, action).allowed;
  const setDone = allowed("column.setDone");
  return {
    rename: allowed("column.rename"),
    reorderTeam: allowed("column.reorderTeam"),
    setDone,
    // Deleting the done column picks a new one, which is the owner's call.
    delete: allowed("column.delete") && (!column.isDone || setDone),
  };
}
