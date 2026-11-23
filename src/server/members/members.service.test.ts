// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";
import { DEFAULT_MANAGER_PERMISSIONS } from "@/utilities/helpers/permissions";
import { mockGroupBy, prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { listMembers, removeMember, setManagerPermissions, setMemberRole } from "./members.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

type Row = { role: "OWNER" | "MANAGER" | "MEMBER"; permissions?: unknown };
const joinedAt = new Date("2026-11-01T09:00:00Z");

/** Answers projectMember.findUnique by user id, like the real table would. */
function members(rows: Record<string, Row>) {
  prismaMock.projectMember.findUnique.mockImplementation(((args: {
    where: { userId_projectId: { userId: string } };
  }) => {
    const id = args.where.userId_projectId.userId;
    const row = rows[id];
    if (!row) return Promise.resolve(null);
    return Promise.resolve({
      role: row.role,
      permissions: row.permissions ?? null,
      pinnedAt: null,
      lastOpenedAt: null,
      joinedAt,
      user: { name: id.toUpperCase(), email: `${id}@team.dev` },
    });
  }) as never);
}

const allOff = Object.fromEntries(Object.keys(DEFAULT_MANAGER_PERMISSIONS).map((key) => [key, false]));

beforeEach(() => resetPrismaMock());

describe("listMembers", () => {
  it("lists owner, then managers, then members (by joining), with switches and task counts", async () => {
    members({ sam: { role: "MEMBER" } });
    prismaMock.projectMember.findMany.mockResolvedValue([
      {
        role: "MEMBER",
        permissions: null,
        joinedAt: new Date(1),
        user: { id: "sam", name: "Sam", email: "s@t.dev", image: null },
      },
      {
        role: "MANAGER",
        permissions: DEFAULT_MANAGER_PERMISSIONS,
        joinedAt: new Date(3),
        user: { id: "kim", name: "Kim", email: "k@t.dev", image: null },
      },
      {
        role: "OWNER",
        permissions: null,
        joinedAt: new Date(2),
        user: { id: "alex", name: "Alex", email: "a@t.dev", image: null },
      },
    ] as never);
    mockGroupBy(prismaMock.task.groupBy).mockResolvedValue([{ assigneeId: "sam", _count: { _all: 3 } }] as never);

    const list = await listMembers("sam", "p1");

    expect(list.map((member) => [member.id, member.role, member.taskCount])).toEqual([
      ["alex", "OWNER", 0],
      ["kim", "MANAGER", 0],
      ["sam", "MEMBER", 3],
    ]);
    expect(list[1].permissions).toEqual(DEFAULT_MANAGER_PERMISSIONS);
    expect(list[0].permissions).toBeNull();
  });

  it("answers 404 to a non-member", async () => {
    members({});
    await expect(listMembers("stranger", "p1")).rejects.toMatchObject({ status: 404 });
    expect(prismaMock.projectMember.findMany).not.toHaveBeenCalled();
  });
});

describe("removeMember", () => {
  it("the owner: unassigns their tasks (no longer taken), removes them and writes member.removed", async () => {
    members({ owner: { role: "OWNER" }, ada: { role: "MEMBER" } });
    prismaMock.task.updateMany.mockResolvedValue({ count: 3 });

    expect(await removeMember("owner", "p1", "ada")).toEqual({
      projectId: "p1",
      userId: "ada",
      unassignedTaskCount: 3,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { projectId: "p1", assigneeId: "ada" },
      data: { assigneeId: null, takenFromPoolAt: null },
    });
    expect(prismaMock.projectMember.delete).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: "ada", projectId: "p1" } },
    });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        actorId: "owner",
        action: "member.removed",
        meta: { userId: "ada", name: "ADA", unassignedTaskCount: 3 },
      },
    });
  });

  it("the owner can remove a manager", async () => {
    members({ owner: { role: "OWNER" }, kim: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS } });
    prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
    await expect(removeMember("owner", "p1", "kim")).resolves.toMatchObject({ userId: "kim" });
  });

  it("never removes the owner", async () => {
    members({ owner: { role: "OWNER" }, kim: { role: "MANAGER", permissions: { ...allOff, removeMembers: true } } });
    for (const actor of ["owner", "kim"]) {
      await expect(removeMember(actor, "p1", "owner")).rejects.toMatchObject({
        status: 400,
        code: "CANNOT_REMOVE_OWNER",
      });
    }
    expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
  });

  it("a manager with removeMembers removes members, but not other managers", async () => {
    members({
      kim: { role: "MANAGER", permissions: { ...allOff, removeMembers: true } },
      lee: { role: "MANAGER", permissions: allOff },
      ada: { role: "MEMBER" },
    });
    prismaMock.task.updateMany.mockResolvedValue({ count: 0 });

    await expect(removeMember("kim", "p1", "ada")).resolves.toMatchObject({ userId: "ada" });
    await expect(removeMember("kim", "p1", "lee")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Managers can only remove members.",
    });
  });

  it("a manager without removeMembers, and members, get 403; someone not in the project 404", async () => {
    members({
      kim: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS },
      sam: { role: "MEMBER" },
      ada: { role: "MEMBER" },
      owner: { role: "OWNER" },
    });
    await expect(removeMember("kim", "p1", "ada")).rejects.toMatchObject({ status: 403 });
    await expect(removeMember("sam", "p1", "ada")).rejects.toMatchObject({ status: 403 });
    await expect(removeMember("owner", "p1", "nobody")).rejects.toMatchObject({
      status: 404,
      code: "MEMBER_NOT_FOUND",
    });
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
  });
});

describe("setMemberRole", () => {
  it("promotes a member with the default switches, under a project lock, and writes member.promoted", async () => {
    members({ owner: { role: "OWNER" }, sam: { role: "MEMBER" } });
    prismaMock.projectMember.count.mockResolvedValue(2);

    expect(await setMemberRole("owner", "p1", "sam", "MANAGER")).toEqual({
      projectId: "p1",
      userId: "sam",
      role: "MANAGER",
      permissions: DEFAULT_MANAGER_PERMISSIONS,
    });
    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS } })
    );
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "owner", action: "member.promoted", meta: { userId: "sam", name: "SAM" } },
    });
  });

  it("refuses a fourth manager with 409 MANAGER_LIMIT", async () => {
    members({ owner: { role: "OWNER" }, sam: { role: "MEMBER" } });
    prismaMock.projectMember.count.mockResolvedValue(3);

    await expect(setMemberRole("owner", "p1", "sam", "MANAGER")).rejects.toMatchObject({
      status: 409,
      code: "MANAGER_LIMIT",
    });
    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
  });

  it("demotes a manager, clearing their switches, and writes member.demoted", async () => {
    members({ owner: { role: "OWNER" }, kim: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS } });

    expect(await setMemberRole("owner", "p1", "kim", "MEMBER")).toMatchObject({ role: "MEMBER", permissions: null });
    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { role: "MEMBER", permissions: Prisma.DbNull } })
    );
    expect(prismaMock.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "member.demoted" }) })
    );
  });

  it("writes nothing when the role is unchanged", async () => {
    members({ owner: { role: "OWNER" }, sam: { role: "MEMBER" } });
    await setMemberRole("owner", "p1", "sam", "MEMBER");
    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("is owner-only (a manager with every switch gets 403) and never changes the owner", async () => {
    const allOn = Object.fromEntries(Object.keys(allOff).map((key) => [key, true]));
    members({ owner: { role: "OWNER" }, kim: { role: "MANAGER", permissions: allOn }, sam: { role: "MEMBER" } });
    await expect(setMemberRole("kim", "p1", "sam", "MANAGER")).rejects.toMatchObject({
      status: 403,
      code: "OWNER_ONLY",
    });
    await expect(setMemberRole("owner", "p1", "owner", "MEMBER")).rejects.toMatchObject({
      status: 400,
      code: "CANNOT_CHANGE_OWNER_ROLE",
    });
  });
});

describe("setManagerPermissions", () => {
  it("changes only the switches that differ and records them in manager.permissions_changed", async () => {
    members({ owner: { role: "OWNER" }, kim: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS } });

    const result = await setManagerPermissions("owner", "p1", "kim", { deleteAnyTask: true, editAnyTask: true });

    expect(result.permissions).toEqual({ ...DEFAULT_MANAGER_PERMISSIONS, deleteAnyTask: true });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        actorId: "owner",
        action: "manager.permissions_changed",
        meta: { userId: "kim", name: "KIM", changes: { deleteAnyTask: true } },
      },
    });
  });

  it("refuses members (400 NOT_A_MANAGER) and anyone but the owner (403)", async () => {
    members({
      owner: { role: "OWNER" },
      kim: { role: "MANAGER", permissions: DEFAULT_MANAGER_PERMISSIONS },
      sam: { role: "MEMBER" },
    });
    await expect(setManagerPermissions("owner", "p1", "sam", { deleteAnyTask: true })).rejects.toMatchObject({
      status: 400,
      code: "NOT_A_MANAGER",
    });
    await expect(setManagerPermissions("kim", "p1", "kim", { deleteAnyTask: true })).rejects.toMatchObject({
      status: 403,
    });
    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
  });
});
