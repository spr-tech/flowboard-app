// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockGroupBy, prismaMock, resetPrismaMock } from "@/test/prismaMock";
import {
  createProject,
  DEFAULT_COLUMNS,
  deleteProject,
  getProject,
  leaveProject,
  listProjects,
  updateProject,
} from "./projects.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const joinedAt = new Date("2026-11-01T09:00:00Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt } as const;
const member = { ...owner, role: "MEMBER" } as const;

const column = (id: string, name: string, position: number, isDone: boolean, tasks: number, creator: string) => ({
  id,
  name,
  position,
  isDone,
  createdAt: joinedAt,
  createdBy: { id: creator, name: creator === "u1" ? "Ada" : "Sam" },
  _count: { tasks },
});

/** What loadDetail reads: the project, its columns, its members and my membership. */
function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Website relaunch",
    description: null,
    colour: "vermilion",
    membersCanAddColumns: true,
    memberColumnLimit: 3,
    createdAt: joinedAt,
    updatedAt: joinedAt,
    columns: [
      column("c1", "To do", 1000, false, 2, "u1"),
      column("c2", "Sam's", 2000, false, 0, "u2"),
      column("c3", "Done", 3000, true, 1, "u1"),
    ],
    members: [
      { ...owner, columnOrder: null, user: { id: "u1", name: "Ada", image: null } },
      { ...member, columnOrder: ["c3", "c1"], user: { id: "u2", name: "Sam", image: null } },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  resetPrismaMock();
  prismaMock.task.findMany.mockResolvedValue([]);
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("listProjects", () => {
  it("returns nothing (and runs no counts) when I have no projects", async () => {
    prismaMock.projectMember.findMany.mockResolvedValue([]);

    expect(await listProjects("u1", "2026-11-21")).toEqual([]);
    expect(prismaMock.task.groupBy).not.toHaveBeenCalled();
  });

  it("builds each card from grouped counts, with my membership and 'updated' from the latest activity", async () => {
    prismaMock.projectMember.findMany.mockResolvedValue([
      {
        ...member,
        pinnedAt: new Date("2026-11-20T10:00:00Z"),
        project: {
          id: "p1",
          name: "Website relaunch",
          colour: "vermilion",
          updatedAt: new Date("2026-11-10T00:00:00Z"),
          _count: { members: 5 },
          members: [{ user: { id: "u2", name: "Alex", image: null } }],
        },
      },
    ] as never);
    // Order of the grouped queries: totals, done, overdue, next due.
    mockGroupBy(prismaMock.task.groupBy)
      .mockResolvedValueOnce([{ projectId: "p1", _count: { _all: 10 } }] as never)
      .mockResolvedValueOnce([{ projectId: "p1", _count: { _all: 4 } }] as never)
      .mockResolvedValueOnce([{ projectId: "p1", _count: { _all: 2 } }] as never)
      .mockResolvedValueOnce([{ projectId: "p1", _min: { dueDate: new Date("2026-11-23T00:00:00Z") } }] as never);
    mockGroupBy(prismaMock.activity.groupBy).mockResolvedValue([
      { projectId: "p1", _max: { createdAt: new Date("2026-11-20T08:00:00Z") } },
    ] as never);

    const [card] = await listProjects("u1", "2026-11-21");

    expect(card).toEqual({
      id: "p1",
      name: "Website relaunch",
      colour: "vermilion",
      updatedAt: "2026-11-20T08:00:00.000Z",
      taskCount: 10,
      doneCount: 4,
      overdueCount: 2,
      nextDueDate: "2026-11-23",
      memberCount: 5,
      members: [{ id: "u2", name: "Alex", image: null }],
      me: {
        role: "MEMBER",
        permissions: null,
        pinnedAt: "2026-11-20T10:00:00.000Z",
        lastOpenedAt: null,
        joinedAt: joinedAt.toISOString(),
      },
    });
  });

  it("counts overdue and next due against the viewer's own 'today'", async () => {
    prismaMock.projectMember.findMany.mockResolvedValue([
      {
        ...owner,
        project: { id: "p1", name: "P", colour: "teal", updatedAt: joinedAt, _count: { members: 1 }, members: [] },
      },
    ] as never);
    mockGroupBy(prismaMock.task.groupBy).mockResolvedValue([] as never);
    mockGroupBy(prismaMock.activity.groupBy).mockResolvedValue([] as never);

    const [card] = await listProjects("u1", "2026-11-21");

    const today = new Date("2026-11-21T00:00:00.000Z");
    expect(prismaMock.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ completedAt: null, dueDate: { lt: today } }) })
    );
    expect(prismaMock.task.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ completedAt: null, dueDate: { gte: today } }) })
    );
    expect(card).toMatchObject({ taskCount: 0, doneCount: 0, overdueCount: 0, nextDueDate: null });
    // No activity yet: "updated" falls back to the project's own timestamp.
    expect(card.updatedAt).toBe(joinedAt.toISOString());
  });
});

describe("getProject", () => {
  it("records the visit, then returns the project with its columns and my role", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.project.findUnique.mockResolvedValue(detailRow() as never);

    const detail = await getProject("u1", "p1", new Date("2026-11-21T12:00:00Z"));

    expect(prismaMock.projectMember.updateMany).toHaveBeenCalled();
    expect(detail).toMatchObject({
      id: "p1",
      taskCount: 3,
      description: null,
      columns: [
        {
          id: "c1",
          name: "To do",
          isDone: false,
          taskCount: 2,
          createdBy: { id: "u1" },
          createdAt: joinedAt.toISOString(),
        },
        { id: "c2", createdBy: { id: "u2", name: "Sam" } },
        { id: "c3", name: "Done", isDone: true, taskCount: 1 },
      ],
      tasks: [],
      members: [
        { id: "u1", name: "Ada", image: null, role: "OWNER" },
        { id: "u2", name: "Sam", image: null, role: "MEMBER" },
      ],
      // Only Sam's column counts toward the member limit.
      columnPermissions: { membersCanAddColumns: true, memberColumnLimit: 3, memberColumnCount: 1 },
      me: { role: "OWNER", columnOrder: null },
    });
  });

  it("returns the board's tasks in the browser's shape", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.project.findUnique.mockResolvedValue(detailRow() as never);
    prismaMock.task.findMany.mockResolvedValue([
      {
        id: "t1",
        projectId: "p1",
        columnId: "c1",
        title: "Fix login",
        description: null,
        priority: "HIGH",
        position: 1000,
        dueDate: new Date("2026-11-25T00:00:00Z"),
        completedAt: null,
        createdAt: joinedAt,
        assignee: { id: "u1", name: "Ada", image: null },
      },
    ] as never);

    const detail = await getProject("u1", "p1");

    expect(detail.tasks).toEqual([
      {
        id: "t1",
        columnId: "c1",
        title: "Fix login",
        description: null,
        priority: "HIGH",
        position: 1000,
        dueDate: "2026-11-25",
        assignee: { id: "u1", name: "Ada", image: null },
        completedAt: null,
        createdAt: joinedAt.toISOString(),
      },
    ]);
    expect(prismaMock.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "p1" }, orderBy: [{ columnId: "asc" }, { position: "asc" }] })
    );
  });

  it("returns a member's own column order", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.project.findUnique.mockResolvedValue(detailRow() as never);

    const detail = await getProject("u2", "p1");

    expect(detail.me).toMatchObject({ role: "MEMBER", columnOrder: ["c3", "c1"] });
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.project.findUnique.mockResolvedValue(detailRow({ members: [] }) as never);

    await expect(getProject("stranger", "p1")).rejects.toMatchObject({ status: 404, code: "PROJECT_NOT_FOUND" });
  });
});

describe("createProject", () => {
  it("creates the project, my OWNER membership, the 3 default columns and an Activity row, in one transaction", async () => {
    prismaMock.project.create.mockResolvedValue({ id: "p9" } as never);
    prismaMock.project.findUnique.mockResolvedValue(detailRow({ id: "p9", name: "Mobile app" }) as never);

    const detail = await createProject("u1", { name: "Mobile app", colour: "teal" });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.project.create).toHaveBeenCalledWith({
      data: {
        name: "Mobile app",
        description: null,
        colour: "teal",
        members: { create: { userId: "u1", role: "OWNER" } },
        // Every column has a creator: the owner made the default ones.
        columns: {
          create: [
            { name: "To do", position: 1000, isDone: false, createdById: "u1" },
            { name: "In progress", position: 2000, isDone: false, createdById: "u1" },
            { name: "Done", position: 3000, isDone: true, createdById: "u1" },
          ],
        },
      },
      select: { id: true },
    });
    expect(DEFAULT_COLUMNS.filter((column) => column.isDone)).toHaveLength(1);
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p9", actorId: "u1", action: "project.created", meta: { name: "Mobile app" } },
    });
    expect(detail.id).toBe("p9");
  });

  it("stores the description when there is one", async () => {
    prismaMock.project.create.mockResolvedValue({ id: "p9" } as never);
    prismaMock.project.findUnique.mockResolvedValue(detailRow({ id: "p9", description: "For the launch" }) as never);

    const detail = await createProject("u1", { name: "Mobile app", colour: "teal", description: "For the launch" });

    expect(prismaMock.project.create.mock.calls[0][0].data).toMatchObject({ description: "For the launch" });
    expect(detail.description).toBe("For the launch");
  });
});

describe("updateProject", () => {
  beforeEach(() => {
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      name: "Old name",
      colour: "vermilion",
      description: null,
      membersCanAddColumns: false,
      memberColumnLimit: 3,
      memberTakeLimit: 5,
    } as never);
    prismaMock.project.findUnique.mockResolvedValue(detailRow() as never);
  });

  it("changes the take limit with a project.take_limit_changed row (owner only)", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await updateProject("u1", "p1", { memberTakeLimit: 8 });

    expect(prismaMock.project.update).toHaveBeenCalledWith({ where: { id: "p1" }, data: { memberTakeLimit: 8 } });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "u1", action: "project.take_limit_changed", meta: { from: 5, to: 8 } },
    });
  });

  it("refuses settings to a manager with every switch on (403 OWNER_ONLY)", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue({
      ...owner,
      role: "MANAGER",
      permissions: {
        createAndAssign: true,
        editAnyTask: true,
        moveAnyTask: true,
        teamOrder: true,
        manageColumns: true,
        deleteAnyTask: true,
        deleteColumns: true,
        inviteMembers: true,
        removeMembers: true,
      },
    } as never);

    await expect(updateProject("u1", "p1", { memberTakeLimit: 8 })).rejects.toMatchObject({
      status: 403,
      code: "OWNER_ONLY",
    });
    expect(prismaMock.project.update).not.toHaveBeenCalled();
  });

  it("lets the owner rename and recolour, with the before and after in the Activity row", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await updateProject("u1", "p1", { name: "New name", colour: "plum" });

    expect(prismaMock.project.update).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { name: "New name", colour: "plum" },
    });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        actorId: "u1",
        action: "project.updated",
        meta: { from: { name: "Old name", colour: "vermilion" }, to: { name: "New name", colour: "plum" } },
      },
    });
  });

  it("writes nothing when nothing actually changed", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await updateProject("u1", "p1", { name: "Old name" });

    expect(prismaMock.project.update).not.toHaveBeenCalled();
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("adds, changes and clears the description, with it in the before and after", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await updateProject("u1", "p1", { description: "For the launch" });

    expect(prismaMock.project.update.mock.calls[0][0].data).toEqual({ description: "For the launch" });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "project.updated",
      meta: { from: { description: null }, to: { description: "For the launch" } },
    });
  });

  it("changes who may add columns with its own project.column_permissions_changed row", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await updateProject("u1", "p1", { membersCanAddColumns: true, memberColumnLimit: 2 });

    expect(prismaMock.project.update.mock.calls[0][0].data).toEqual({
      membersCanAddColumns: true,
      memberColumnLimit: 2,
    });
    expect(prismaMock.activity.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "project.column_permissions_changed",
      meta: { membersCanAddColumns: true, memberColumnLimit: 2 },
    });
  });

  it("switching it off never deletes columns, it only blocks new ones", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      name: "Old name",
      colour: "vermilion",
      description: null,
      membersCanAddColumns: true,
      memberColumnLimit: 3,
    } as never);

    const detail = await updateProject("u1", "p1", { membersCanAddColumns: false });

    expect(prismaMock.column.delete).not.toHaveBeenCalled();
    expect(prismaMock.column.deleteMany).not.toHaveBeenCalled();
    expect(detail.columns.map((c) => c.id)).toEqual(["c1", "c2", "c3"]);
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      meta: { membersCanAddColumns: false, memberColumnLimit: 3 },
    });
  });

  it("answers 403 to a member and 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(member as never).mockResolvedValueOnce(null);

    await expect(updateProject("u2", "p1", { name: "Mine now" })).rejects.toMatchObject({
      status: 403,
      code: "OWNER_ONLY",
    });
    await expect(updateProject("u3", "p1", { name: "Mine now" })).rejects.toMatchObject({ status: 404 });
    expect(prismaMock.project.update).not.toHaveBeenCalled();
  });
});

describe("deleteProject", () => {
  beforeEach(() => {
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({ name: "Website relaunch" } as never);
  });

  it("refuses a name that isn't exactly the project's, with a field message", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await expect(deleteProject("u1", "p1", "website relaunch")).rejects.toMatchObject({
      status: 400,
      code: "NAME_MISMATCH",
      fields: { name: expect.any(String) },
    });
    expect(prismaMock.project.delete).not.toHaveBeenCalled();
  });

  it("deletes with the exact name", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    expect(await deleteProject("u1", "p1", "Website relaunch")).toEqual({ id: "p1" });
    expect(prismaMock.project.delete).toHaveBeenCalledWith({ where: { id: "p1" } });
  });

  it("answers 403 to a member, even with the right name", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);

    await expect(deleteProject("u2", "p1", "Website relaunch")).rejects.toMatchObject({ status: 403 });
    expect(prismaMock.project.delete).not.toHaveBeenCalled();
  });
});

describe("leaveProject", () => {
  it("unassigns my tasks, records the leave and removes my membership, in one transaction", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);
    prismaMock.task.updateMany.mockResolvedValue({ count: 3 });

    expect(await leaveProject("u2", "p1")).toEqual({ projectId: "p1", unassignedTaskCount: 3 });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { projectId: "p1", assigneeId: "u2" },
      data: { assigneeId: null },
    });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "u2", action: "member.left", meta: { unassignedTaskCount: 3 } },
    });
    expect(prismaMock.projectMember.delete).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: "u2", projectId: "p1" } },
    });
  });

  it("won't let the owner leave", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    await expect(leaveProject("u1", "p1")).rejects.toMatchObject({ status: 403, code: "OWNER_CANNOT_LEAVE" });
    expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(leaveProject("u3", "p1")).rejects.toMatchObject({ status: 404 });
  });
});
