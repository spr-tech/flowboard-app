import { describe, expect, it } from "vitest";

import {
  can,
  DEFAULT_MANAGER_PERMISSIONS,
  PermissionReason,
  takeLimitReason,
  taskCreateRules,
  usesTeamCardOrder,
  usesTeamColumnOrder,
  type ManagerPermission,
  type ManagerPermissions,
  type PermissionAction,
  type PermissionContext,
} from "./permissions";

const ME = "me";
const OTHER = "other";
const allOff = Object.fromEntries(
  Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((key) => [key, false])
) as ManagerPermissions;
const allOn = Object.fromEntries(
  Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((key) => [key, true])
) as ManagerPermissions;

const owner = { role: "OWNER" as const, permissions: null };
const member = { role: "MEMBER" as const, permissions: null, takenOpenCount: 0 };
const manager = (permissions: ManagerPermissions) => ({ role: "MANAGER" as const, permissions, takenOpenCount: 0 });

/** Someone else's task, assigned to someone else: the case where only powers count. */
const othersTask = { createdById: OTHER, assigneeId: OTHER };
const ctx = (
  membership: PermissionContext["membership"],
  extra: Partial<PermissionContext> = {}
): PermissionContext => ({
  me: { id: ME },
  membership,
  project: { memberTakeLimit: 5 },
  task: othersTask,
  note: { authorId: OTHER },
  target: { role: "MEMBER" },
  ...extra,
});

const allowed = (action: PermissionAction, context: PermissionContext) => can(action, context).allowed;

// Which switch grants each action to a manager (null: no switch grants it).
const switchFor: Record<PermissionAction, ManagerPermission | null> = {
  "task.create": null,
  "task.assignOthers": "createAndAssign",
  "task.take": null,
  "task.editTitle": "editAnyTask",
  "task.editDescription": "editAnyTask",
  "task.editPriority": "editAnyTask",
  "task.editDueDate": "editAnyTask",
  "task.move": "moveAnyTask",
  "task.reorderTeam": "teamOrder",
  "task.delete": "deleteAnyTask",
  "note.add": null,
  "note.delete": null,
  "column.add": "manageColumns",
  "column.rename": "manageColumns",
  "column.reorderTeam": "manageColumns",
  "column.delete": "deleteColumns",
  "column.setDone": null,
  "member.invite": "inviteMembers",
  "member.remove": "removeMembers",
  "member.changeRole": null,
  "manager.editPermissions": null,
  "project.editSettings": null,
  "project.delete": null,
};

// On someone else's task (and an unassigned one for task.take), with no switches: the member rule.
const memberAllowed: Record<PermissionAction, boolean> = {
  "task.create": true,
  "task.assignOthers": false,
  "task.take": true,
  "task.editTitle": false,
  "task.editDescription": false,
  "task.editPriority": false,
  "task.editDueDate": false,
  "task.move": false,
  "task.reorderTeam": false,
  "task.delete": false,
  "note.add": true,
  "note.delete": false,
  "column.add": false,
  "column.rename": false,
  "column.reorderTeam": false,
  "column.delete": false,
  "column.setDone": false,
  "member.invite": false,
  "member.remove": false,
  "member.changeRole": false,
  "manager.editPermissions": false,
  "project.editSettings": false,
  "project.delete": false,
};

const actions = Object.keys(switchFor) as PermissionAction[];
const forAction = (action: PermissionAction, membership: PermissionContext["membership"]) =>
  ctx(membership, action === "task.take" ? { task: { createdById: OTHER, assigneeId: null } } : {});

describe("can: every action", () => {
  it.each(actions)("%s: the owner may", (action) => {
    expect(allowed(action, forAction(action, owner))).toBe(true);
  });

  it.each(actions)("%s: a member follows the member rule", (action) => {
    expect(allowed(action, forAction(action, member))).toBe(memberAllowed[action]);
  });

  it.each(actions)("%s: a manager with every switch off follows the member rule", (action) => {
    expect(allowed(action, forAction(action, manager(allOff)))).toBe(memberAllowed[action]);
  });

  it.each(actions)("%s: a manager's own switch turns it on, and nothing else does", (action) => {
    const name = switchFor[action];
    if (name === null) {
      // No switch grants it: even a manager with all switches on gets only the member rule.
      expect(allowed(action, forAction(action, manager(allOn)))).toBe(memberAllowed[action]);
      return;
    }
    expect(allowed(action, forAction(action, manager({ ...allOff, [name]: true })))).toBe(true);
    expect(allowed(action, forAction(action, manager({ ...allOn, [name]: false })))).toBe(memberAllowed[action]);
  });

  it.each(actions)("%s: every 'not allowed' has a reason", (action) => {
    const result = can(action, forAction(action, member));
    if (!result.allowed) expect(result.reason.length).toBeGreaterThan(10);
  });
});

describe("can: always owner-only", () => {
  const ownerOnly: PermissionAction[] = [
    "project.editSettings",
    "member.changeRole",
    "manager.editPermissions",
    "column.setDone",
    "project.delete",
  ];
  it.each(ownerOnly)("%s is refused to a manager with every switch on", (action) => {
    expect(can(action, ctx(manager(allOn)))).toEqual({
      allowed: false,
      reason: action === "column.setDone" ? PermissionReason.setDone : PermissionReason.ownerOnly,
    });
  });
});

describe("can: member tasks", () => {
  const mine = { createdById: ME, assigneeId: ME };
  const assignedToMe = { createdById: OTHER, assigneeId: ME };

  it("on a task they created: edit title, description, priority; move; delete; never the due date", () => {
    const context = ctx(member, { task: mine });
    for (const action of [
      "task.editTitle",
      "task.editDescription",
      "task.editPriority",
      "task.move",
      "task.delete",
    ] as const) {
      expect(allowed(action, context)).toBe(true);
    }
    expect(can("task.editDueDate", context)).toEqual({ allowed: false, reason: PermissionReason.dueDateLocked });
  });

  it("on a task assigned to them or taken from the pool: move only, the fields are locked", () => {
    const context = ctx(member, { task: assignedToMe });
    expect(allowed("task.move", context)).toBe(true);
    expect(can("task.editTitle", context)).toEqual({ allowed: false, reason: PermissionReason.editLocked });
    expect(allowed("task.editDueDate", context)).toBe(false);
    expect(can("task.delete", context)).toEqual({ allowed: false, reason: PermissionReason.delete });
  });

  it("on someone else's task: no move, no edit, with the reasons the user sees", () => {
    const context = ctx(member);
    expect(can("task.move", context)).toEqual({ allowed: false, reason: "You can only move tasks assigned to you." });
    expect(can("task.editTitle", context)).toEqual({ allowed: false, reason: PermissionReason.editNotMine });
  });

  it("a task they created that was reassigned: still editable, but not movable", () => {
    const context = ctx(member, { task: { createdById: ME, assigneeId: OTHER } });
    expect(allowed("task.editTitle", context)).toBe(true);
    expect(allowed("task.move", context)).toBe(false);
  });

  it("notes: anyone adds; authors delete their own; the owner deletes any", () => {
    expect(allowed("note.add", ctx(member))).toBe(true);
    expect(allowed("note.delete", ctx(member, { note: { authorId: ME } }))).toBe(true);
    expect(can("note.delete", ctx(manager(allOn)))).toEqual({ allowed: false, reason: PermissionReason.deleteNote });
    expect(allowed("note.delete", ctx(owner))).toBe(true);
  });
});

describe("can: the take limit", () => {
  const unassigned = { createdById: OTHER, assigneeId: null };
  const at = (takenOpenCount: number) =>
    can("task.take", ctx({ ...member, takenOpenCount }, { task: unassigned, project: { memberTakeLimit: 3 } }));

  it("allows up to the limit and refuses at and over it", () => {
    expect(at(2)).toEqual({ allowed: true });
    expect(at(3)).toEqual({ allowed: false, reason: takeLimitReason(3) });
    expect(at(4)).toEqual({ allowed: false, reason: takeLimitReason(4) });
  });

  it("words the message for one task and for several", () => {
    expect(takeLimitReason(1)).toBe("You've taken 1 open task. Finish one first, or ask the owner to assign more.");
    expect(takeLimitReason(5)).toBe("You've taken 5 open tasks. Finish one first, or ask the owner to assign more.");
  });

  it("never applies to the owner or managers", () => {
    const busy = { task: unassigned, project: { memberTakeLimit: 1 } };
    expect(allowed("task.take", ctx({ ...owner, takenOpenCount: 9 }, busy))).toBe(true);
    expect(allowed("task.take", ctx({ ...manager(allOff), takenOpenCount: 9 }, busy))).toBe(true);
  });

  it("refuses a task someone is already on", () => {
    expect(can("task.take", ctx(owner))).toEqual({ allowed: false, reason: PermissionReason.alreadyAssigned });
  });
});

describe("can: removing people", () => {
  const remover = manager({ ...allOff, removeMembers: true });
  it("a manager with removeMembers removes members but not managers or the owner", () => {
    expect(allowed("member.remove", ctx(remover, { target: { role: "MEMBER" } }))).toBe(true);
    expect(can("member.remove", ctx(remover, { target: { role: "MANAGER" } }))).toEqual({
      allowed: false,
      reason: PermissionReason.removeOnlyMembers,
    });
    expect(allowed("member.remove", ctx(remover, { target: { role: "OWNER" } }))).toBe(false);
  });

  it("the owner removes members and managers, never themselves", () => {
    expect(allowed("member.remove", ctx(owner, { target: { role: "MANAGER" } }))).toBe(true);
    expect(can("member.remove", ctx(owner, { target: { role: "OWNER" } }))).toEqual({
      allowed: false,
      reason: PermissionReason.removeOwner,
    });
  });
});

describe("helpers built on can", () => {
  it("taskCreateRules: the member rule unless I may assign others", () => {
    expect(taskCreateRules(ctx(member))).toEqual({ assignToSelf: true, descriptionMin: 20 });
    expect(taskCreateRules(ctx(manager(allOff)))).toEqual({ assignToSelf: true, descriptionMin: 20 });
    expect(taskCreateRules(ctx(manager(DEFAULT_MANAGER_PERMISSIONS)))).toEqual({
      assignToSelf: false,
      descriptionMin: 0,
    });
    expect(taskCreateRules(ctx(owner))).toEqual({ assignToSelf: false, descriptionMin: 0 });
  });

  it("team or personal order, for cards and columns separately", () => {
    const cardsOnly = ctx(manager({ ...allOff, teamOrder: true }));
    expect(usesTeamCardOrder(cardsOnly)).toBe(true);
    expect(usesTeamColumnOrder(cardsOnly)).toBe(false);
    expect(usesTeamCardOrder(ctx(member))).toBe(false);
    expect(usesTeamColumnOrder(ctx(owner))).toBe(true);
  });

  it("the defaults for a new manager", () => {
    expect(DEFAULT_MANAGER_PERMISSIONS).toEqual({
      createAndAssign: true,
      editAnyTask: true,
      moveAnyTask: true,
      teamOrder: true,
      manageColumns: true,
      deleteAnyTask: false,
      deleteColumns: false,
      inviteMembers: true,
      removeMembers: false,
    });
  });
});
