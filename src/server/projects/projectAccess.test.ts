// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { assertCan, permissionContext, permissionsOf, sortByRole } from "./projectAccess";

describe("sortByRole", () => {
  it("puts the owner first, then managers, then members, each by when they joined", () => {
    const rows = [
      { id: "m2", role: "MEMBER" as const, joinedAt: new Date(2) },
      { id: "k", role: "MANAGER" as const, joinedAt: new Date(5) },
      { id: "m1", role: "MEMBER" as const, joinedAt: new Date(1) },
      { id: "o", role: "OWNER" as const, joinedAt: new Date(9) },
    ];
    expect(sortByRole(rows).map((row) => row.id)).toEqual(["o", "k", "m1", "m2"]);
  });
});

describe("permissionsOf", () => {
  it("reads a manager's switches, treating anything missing or malformed as off", () => {
    expect(permissionsOf({ role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS })).toEqual(
      DEFAULT_MANAGER_PERMISSIONS
    );
    const broken = permissionsOf({ role: "MANAGER", permissions: { deleteAnyTask: "yes", inviteMembers: true } });
    expect(broken?.deleteAnyTask).toBe(false);
    expect(broken?.inviteMembers).toBe(true);
    expect(permissionsOf({ role: "MANAGER", permissions: null })?.editAnyTask).toBe(false);
  });

  it("is null for the owner and members, whatever is stored", () => {
    expect(permissionsOf({ role: "MEMBER", permissions: DEFAULT_MANAGER_PERMISSIONS })).toBeNull();
    expect(permissionsOf({ role: "OWNER", permissions: null })).toBeNull();
  });
});

describe("assertCan", () => {
  const member = permissionContext(
    "sam",
    { role: "MEMBER", permissions: null },
    {
      task: { createdById: "alex", assigneeId: "alex" },
    }
  );

  it("throws 403 TASK_FORBIDDEN with can()'s reason for task actions", () => {
    expect(() => assertCan("task.move", member)).toThrow(
      expect.objectContaining({
        status: 403,
        code: "TASK_FORBIDDEN",
        message: "You can only move tasks assigned to you.",
      })
    );
  });

  it("uses OWNER_ONLY for owner-only settings and FORBIDDEN for the rest", () => {
    expect(() => assertCan("project.editSettings", member)).toThrow(expect.objectContaining({ code: "OWNER_ONLY" }));
    expect(() => assertCan("column.add", member)).toThrow(expect.objectContaining({ code: "FORBIDDEN" }));
  });

  it("passes silently when allowed", () => {
    expect(() => assertCan("note.add", member)).not.toThrow();
  });
});
