// Who may do what in a project (docs/plan/01-product-and-flows.md, "Permissions"). One pure
// function, used by the server's checks and by the browser, so the two never disagree. It reads no
// database: callers pass in the facts. Every "not allowed" carries the words the user sees, both
// in the UI and in the 403 the server sends.
import type { ProjectRole } from "@/models/responses/projectResponses";

/** A manager's switches, set by the owner. Off means the member rule for that power. */
export type ManagerPermissions = {
  createAndAssign: boolean;
  editAnyTask: boolean;
  moveAnyTask: boolean;
  /** "Change team task order in columns". */
  teamOrder: boolean;
  /** Add, rename and reorder team columns. */
  manageColumns: boolean;
  deleteAnyTask: boolean;
  deleteColumns: boolean;
  inviteMembers: boolean;
  removeMembers: boolean;
};

export type ManagerPermission = keyof ManagerPermissions;

/** What a newly promoted manager gets. */
export const DEFAULT_MANAGER_PERMISSIONS: ManagerPermissions = {
  createAndAssign: true,
  editAnyTask: true,
  moveAnyTask: true,
  teamOrder: true,
  manageColumns: true,
  deleteAnyTask: false,
  deleteColumns: false,
  inviteMembers: true,
  removeMembers: false,
};

export const MANAGER_LIMIT = 3;
export const MEMBER_DESCRIPTION_MIN = 20;
export const TAKE_LIMIT_MIN = 1;
export const TAKE_LIMIT_MAX = 20;

export type PermissionAction =
  | "task.create"
  | "task.assignOthers"
  | "task.take"
  | "task.editTitle"
  | "task.editDescription"
  | "task.editPriority"
  | "task.editDueDate"
  | "task.move"
  | "task.reorderTeam"
  | "task.delete"
  | "note.add"
  | "note.delete"
  | "column.add"
  | "column.rename"
  | "column.reorderTeam"
  | "column.delete"
  | "column.setDone"
  | "member.invite"
  | "member.remove"
  | "member.changeRole"
  | "manager.editPermissions"
  | "project.editSettings"
  | "project.delete";

export type PermissionContext = {
  me: { id: string };
  membership: {
    role: ProjectRole;
    /** Only read for managers; null (or missing) for others. */
    permissions?: ManagerPermissions | null;
    /** Open tasks I took from the pool (not done). Needed for task.take. */
    takenOpenCount?: number;
  };
  project?: { memberTakeLimit: number };
  task?: {
    createdById: string;
    assigneeId: string | null;
    /** In the done column (task.take). */ inDoneColumn?: boolean;
  };
  note?: { authorId: string };
  /** The person being removed (member.remove). */
  target?: { role: ProjectRole };
};

export type PermissionResult = { allowed: true } | { allowed: false; reason: string };

const yes: PermissionResult = { allowed: true };
const no = (reason: string): PermissionResult => ({ allowed: false, reason });

export const PermissionReason = {
  ownerOnly: "Only the project owner can do that.",
  setDone: "Only the project owner can choose the done column.",
  move: "You can only move tasks assigned to you.",
  assignOthers: "Only the owner or a manager can assign tasks to other people.",
  alreadyAssigned: "Someone is already on this task.",
  takeDone: "This task is done. Only open tasks can be taken.",
  reorderTeam: "Your card order changes only your own view.",
  editLocked: "Assigned to you: only the owner or a manager can change this. You can move it and add notes.",
  editNotMine: "Only the person who created this task, the owner or a manager can change it.",
  dueDateLocked: "The due date is set when the task is created. Ask the owner or a manager to change it.",
  delete: "You can only delete tasks you created.",
  deleteNote: "You can only delete your own notes.",
  columns: "Only the owner or a manager can change the team columns.",
  deleteColumns: "Only the owner, or a manager allowed to, can delete columns.",
  invite: "Only the owner, or a manager allowed to, can invite people.",
  remove: "Only the owner, or a manager allowed to, can remove people.",
  removeOnlyMembers: "Managers can only remove members.",
  removeOwner: "The owner can't be removed from their own project.",
} as const;

export const takeLimitReason = (count: number) =>
  `You've taken ${count} open task${count === 1 ? "" : "s"}. Finish one first, or ask the owner to assign more.`;

type Rule = (ctx: PermissionContext) => PermissionResult;

const isOwner = (ctx: PermissionContext) => ctx.membership.role === "OWNER";

/** The owner always; a manager when this switch is on. */
const hasPower = (ctx: PermissionContext, power: ManagerPermission) =>
  isOwner(ctx) || (ctx.membership.role === "MANAGER" && ctx.membership.permissions?.[power] === true);

/** The owner, or a manager with this switch; otherwise `fallback` (the member rule). */
const power =
  (switchName: ManagerPermission, fallback: Rule): Rule =>
  (ctx) =>
    hasPower(ctx, switchName) ? yes : fallback(ctx);

const ownerOnly =
  (reason: string = PermissionReason.ownerOnly): Rule =>
  (ctx) =>
    isOwner(ctx) ? yes : no(reason);

const deny =
  (reason: string): Rule =>
  () =>
    no(reason);

const createdByMe = (ctx: PermissionContext) => ctx.task?.createdById === ctx.me.id;

/** Member rule for title, description and priority: only on tasks they created. */
const editOwnTask: Rule = (ctx) => {
  if (createdByMe(ctx)) return yes;
  return no(ctx.task?.assigneeId === ctx.me.id ? PermissionReason.editLocked : PermissionReason.editNotMine);
};

const take: Rule = (ctx) => {
  if (ctx.task?.assigneeId) return no(PermissionReason.alreadyAssigned);
  if (ctx.task?.inDoneColumn) return no(PermissionReason.takeDone);
  // The take limit is for members only.
  if (ctx.membership.role !== "MEMBER") return yes;
  const count = ctx.membership.takenOpenCount ?? 0;
  const limit = ctx.project?.memberTakeLimit ?? 0;
  return count < limit ? yes : no(takeLimitReason(count));
};

const remove: Rule = (ctx) => {
  if (ctx.target?.role === "OWNER") return no(PermissionReason.removeOwner);
  if (isOwner(ctx)) return yes;
  if (!hasPower(ctx, "removeMembers")) return no(PermissionReason.remove);
  return ctx.target?.role === "MEMBER" ? yes : no(PermissionReason.removeOnlyMembers);
};

const rules: Record<PermissionAction, Rule> = {
  // Everyone may create; what a member's task must look like is in taskCreateRules.
  "task.create": () => yes,
  "task.assignOthers": power("createAndAssign", deny(PermissionReason.assignOthers)),
  "task.take": take,
  "task.editTitle": power("editAnyTask", editOwnTask),
  "task.editDescription": power("editAnyTask", editOwnTask),
  "task.editPriority": power("editAnyTask", editOwnTask),
  "task.editDueDate": power("editAnyTask", deny(PermissionReason.dueDateLocked)),
  "task.move": power("moveAnyTask", (ctx) => (ctx.task?.assigneeId === ctx.me.id ? yes : no(PermissionReason.move))),
  "task.reorderTeam": power("teamOrder", deny(PermissionReason.reorderTeam)),
  "task.delete": power("deleteAnyTask", (ctx) => (createdByMe(ctx) ? yes : no(PermissionReason.delete))),
  "note.add": () => yes,
  "note.delete": (ctx) => (isOwner(ctx) || ctx.note?.authorId === ctx.me.id ? yes : no(PermissionReason.deleteNote)),
  "column.add": power("manageColumns", deny(PermissionReason.columns)),
  "column.rename": power("manageColumns", deny(PermissionReason.columns)),
  "column.reorderTeam": power("manageColumns", deny(PermissionReason.columns)),
  "column.delete": power("deleteColumns", deny(PermissionReason.deleteColumns)),
  "column.setDone": ownerOnly(PermissionReason.setDone),
  "member.invite": power("inviteMembers", deny(PermissionReason.invite)),
  "member.remove": remove,
  "member.changeRole": ownerOnly(),
  "manager.editPermissions": ownerOnly(),
  "project.editSettings": ownerOnly(),
  "project.delete": ownerOnly(),
};

/** May I do this? With the reason to show when not. */
export function can(action: PermissionAction, ctx: PermissionContext): PermissionResult {
  return rules[action](ctx);
}

/**
 * What a new task must look like for me: the member rule (assigned to me, a description of at
 * least 20 characters) unless I may assign tasks to others.
 */
export function taskCreateRules(ctx: Pick<PermissionContext, "me" | "membership">) {
  const free = can("task.assignOthers", ctx).allowed;
  return { assignToSelf: !free, descriptionMin: free ? 0 : MEMBER_DESCRIPTION_MIN };
}

/** Whether my card drags change the team order (else they change only my view). */
export const usesTeamCardOrder = (ctx: Pick<PermissionContext, "me" | "membership">) =>
  can("task.reorderTeam", ctx).allowed;

/** Whether my column drags change the team order (else they change only my view). */
export const usesTeamColumnOrder = (ctx: Pick<PermissionContext, "me" | "membership">) =>
  can("column.reorderTeam", ctx).allowed;
