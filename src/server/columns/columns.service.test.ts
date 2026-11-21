// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { createColumn, deleteColumn, moveColumn, updateColumn } from "./columns.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const NOW = new Date("2026-11-22T10:00:00Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW } as const;
const member = { ...owner, role: "MEMBER" } as const;

const col = (id: string, name: string, position: number, isDone = false, createdById = "demo") => ({
  id,
  projectId: "p1",
  name,
  position,
  isDone,
  createdById,
  createdAt: NOW,
  createdBy: { id: createdById, name: createdById },
});
const todo = col("todo", "To do", 1000);
const doing = col("doing", "In progress", 2000);
const done = col("done", "Done", 3000, true);
const samsColumn = col("review", "Review", 2500, false, "sam");
const board = [todo, doing, done];

/** Column and task writes in the order they happened, to check the done flag is cleared before it's set. */
let writeLog: unknown[] = [];

function asRole(role: typeof owner | typeof member, column = doing, columns = board) {
  prismaMock.column.findUnique.mockResolvedValue(column as never);
  prismaMock.projectMember.findUnique.mockResolvedValue(role as never);
  prismaMock.column.findMany.mockResolvedValue(columns as never);
  prismaMock.column.update.mockImplementation(((args: { where: { id: string }; data: object }) => {
    writeLog.push(args);
    const existing = [...columns, samsColumn].find((c) => c.id === args.where.id);
    return Promise.resolve({ ...existing, ...args.data });
  }) as never);
  prismaMock.task.updateMany.mockImplementation(((args: unknown) => {
    writeLog.push(args);
    return Promise.resolve({ count: 1 });
  }) as never);
  prismaMock.task.count.mockResolvedValue(0);
  prismaMock.column.create.mockImplementation(((args: { data: { createdById: string } }) =>
    Promise.resolve({ ...col("new", "", 0, false, args.data.createdById), ...args.data })) as never);
}

/** The project's column settings, and how many member-created columns it already has. */
function settings(membersCanAddColumns: boolean, memberColumnLimit: number, used: number) {
  prismaMock.project.findUniqueOrThrow.mockResolvedValue({
    membersCanAddColumns,
    memberColumnLimit,
    members: [{ userId: "demo" }],
  } as never);
  prismaMock.column.count.mockResolvedValue(used);
}

beforeEach(() => {
  resetPrismaMock();
  writeLog = [];
});

describe("createColumn", () => {
  it("lets the owner add a column whatever the switch says, just before the done column", async () => {
    asRole(owner);
    settings(false, 3, 3);

    const created = await createColumn("demo", "p1", { name: "Review" });

    expect(prismaMock.column.create.mock.calls[0][0].data).toEqual({
      projectId: "p1",
      name: "Review",
      position: 2500,
      createdById: "demo",
    });
    expect(created).toMatchObject({ name: "Review", taskCount: 0, createdBy: { id: "demo" } });
    expect(prismaMock.project.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      actorId: "demo",
      action: "column.created",
    });
  });

  it("blocks members with 403 COLUMNS_LOCKED while the switch is off", async () => {
    asRole(member);
    settings(false, 3, 0);

    await expect(createColumn("sam", "p1", { name: "Mine" })).rejects.toMatchObject({
      status: 403,
      code: "COLUMNS_LOCKED",
    });
    expect(prismaMock.column.create).not.toHaveBeenCalled();
  });

  it("lets a member add while the switch is on and under the shared limit, as the creator", async () => {
    asRole(member);
    settings(true, 3, 2);

    await createColumn("sam", "p1", { name: "Mine" });

    expect(prismaMock.column.count).toHaveBeenCalledWith({ where: { projectId: "p1", createdById: { not: "demo" } } });
    expect(prismaMock.column.create.mock.calls[0][0].data).toMatchObject({ createdById: "sam" });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      actorId: "sam",
      action: "column.created",
    });
  });

  it("answers 409 COLUMN_LIMIT_REACHED at the limit, counting every member's columns together", async () => {
    asRole(member);
    settings(true, 3, 3);

    await expect(createColumn("sam", "p1", { name: "One more" })).rejects.toMatchObject({
      status: 409,
      code: "COLUMN_LIMIT_REACHED",
      message: "Column limit reached (3 of 3). The owner can raise it.",
    });
  });

  it("allows a member to add again once a member column is deleted (back under the limit)", async () => {
    asRole(member);
    settings(true, 3, 2);

    await expect(createColumn("sam", "p1", { name: "Again" })).resolves.toMatchObject({ name: "Again" });
  });
});

describe("updateColumn", () => {
  it("lets the owner rename any column, with a column.renamed row", async () => {
    asRole(owner, samsColumn);

    const column = await updateColumn("demo", "review", { name: "QA" });

    expect(column.name).toBe("QA");
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "column.renamed",
      meta: { from: "Review", to: "QA" },
    });
  });

  it("lets a member rename only a column they added", async () => {
    asRole(member, samsColumn);
    await expect(updateColumn("sam", "review", { name: "Sam QA" })).resolves.toMatchObject({ name: "Sam QA" });

    asRole(member, doing);
    await expect(updateColumn("sam", "doing", { name: "Nope" })).rejects.toMatchObject({
      status: 403,
      code: "NOT_YOUR_COLUMN",
    });
  });

  it("keeps Set as done owner-only, even on a member's own column", async () => {
    asRole(member, samsColumn);
    await expect(updateColumn("sam", "review", { isDone: true })).rejects.toMatchObject({
      status: 403,
      code: "OWNER_ONLY",
    });
  });

  it("answers 404 to a non-member", async () => {
    asRole(member);
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    await expect(updateColumn("stranger", "doing", { name: "X" })).rejects.toMatchObject({
      status: 404,
      code: "COLUMN_NOT_FOUND",
    });
  });

  it("switches the done column: clears the old flag first, uncompletes its tasks, completes the new one's", async () => {
    asRole(owner);
    prismaMock.column.findFirst.mockResolvedValue({ id: "done", name: "Done" } as never);

    const column = await updateColumn("demo", "doing", { isDone: true }, NOW);

    expect(column.isDone).toBe(true);
    expect(writeLog).toEqual([
      expect.objectContaining({ where: { id: "done" }, data: { isDone: false } }),
      { where: { columnId: "done" }, data: { completedAt: null } },
      expect.objectContaining({ where: { id: "doing" }, data: { isDone: true } }),
      { where: { columnId: "doing", completedAt: null }, data: { completedAt: NOW } },
    ]);
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "column.done_set",
      meta: { name: "In progress", previous: "Done" },
    });
  });
});

describe("moveColumn (team order)", () => {
  it("is owner-only: 403 for members", async () => {
    asRole(member);
    await expect(moveColumn("sam", "doing", { beforeColumnId: "todo" })).rejects.toMatchObject({
      status: 403,
      code: "OWNER_ONLY",
    });
  });

  it("goes first, between two, or last, from the neighbours' current positions", async () => {
    asRole(owner, done);
    await moveColumn("demo", "done", { beforeColumnId: "todo" });
    expect(writeLog.at(-1)).toMatchObject({ where: { id: "done" }, data: { position: 0 } });

    asRole(owner, done);
    await moveColumn("demo", "done", { afterColumnId: "todo", beforeColumnId: "doing" });
    expect(writeLog.at(-1)).toMatchObject({ data: { position: 1500 } });

    asRole(owner, todo);
    await moveColumn("demo", "todo", { afterColumnId: "done" });
    expect(writeLog.at(-1)).toMatchObject({ data: { position: 4000 } });
    expect(prismaMock.activity.create.mock.calls.at(-1)?.[0].data).toMatchObject({ action: "column.moved" });
  });

  it("re-spaces all the project's columns when the gap is too small", async () => {
    const extra = col("x", "X", 9000);
    asRole(owner, extra, [todo, { ...doing, position: 1000.0001 }, done, extra]);

    await moveColumn("demo", "x", { afterColumnId: "todo", beforeColumnId: "doing" });

    expect(writeLog.map((write) => (write as { data: { position: number } }).data.position)).toEqual([
      1000, 2000, 3000, 1500,
    ]);
  });

  it("refuses neighbours that aren't next to each other", async () => {
    asRole(owner, done);
    await expect(moveColumn("demo", "done", { afterColumnId: "todo", beforeColumnId: "zzz" })).rejects.toMatchObject({
      code: "INVALID_POSITION",
    });
  });
});

describe("deleteColumn", () => {
  it("is owner-only, even for a member's own column", async () => {
    asRole(member, samsColumn);
    await expect(deleteColumn("sam", "review", { moveTasksTo: "todo" })).rejects.toMatchObject({ status: 403 });
  });

  it("never deletes the last column", async () => {
    asRole(owner, todo, [todo]);

    await expect(deleteColumn("demo", "todo", { moveTasksTo: "x" })).rejects.toMatchObject({
      status: 400,
      code: "LAST_COLUMN",
    });
    expect(prismaMock.column.delete).not.toHaveBeenCalled();
  });

  it("moves the tasks to the bottom of the chosen column, in order, then deletes", async () => {
    asRole(owner);
    prismaMock.task.findMany.mockResolvedValue([
      { id: "a", completedAt: null },
      { id: "b", completedAt: null },
    ] as never);
    prismaMock.task.findFirst.mockResolvedValue({ position: 5000 } as never);

    expect(await deleteColumn("demo", "doing", { moveTasksTo: "todo" }, NOW)).toEqual({ id: "doing" });

    expect(prismaMock.task.update.mock.calls.map(([args]) => [args.where.id, args.data])).toEqual([
      ["a", { columnId: "todo", position: 6000, completedAt: null }],
      ["b", { columnId: "todo", position: 7000, completedAt: null }],
    ]);
    expect(prismaMock.column.delete).toHaveBeenCalledWith({ where: { id: "doing" } });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "column.deleted",
      meta: { name: "In progress", movedTo: "To do", taskCount: 2 },
    });
  });

  it("deletes the column with its tasks only when the exact name is typed", async () => {
    asRole(owner);
    await expect(deleteColumn("demo", "doing", { confirmName: "in progress" })).rejects.toMatchObject({
      status: 400,
      code: "NAME_MISMATCH",
    });
    expect(prismaMock.column.delete).not.toHaveBeenCalled();

    prismaMock.task.count.mockResolvedValue(3);
    await deleteColumn("demo", "doing", { confirmName: "In progress" });
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(prismaMock.column.delete).toHaveBeenCalledWith({ where: { id: "doing" } });
  });

  it("deleting the done column hands the flag to the column the tasks went to, keeping them completed", async () => {
    const completedAt = new Date("2026-11-20T00:00:00Z");
    asRole(owner, done);
    prismaMock.task.findMany.mockResolvedValue([{ id: "a", completedAt }] as never);
    prismaMock.task.findFirst.mockResolvedValue(null);
    prismaMock.column.findFirst.mockResolvedValue(null); // the old done column is already gone

    await deleteColumn("demo", "done", { moveTasksTo: "todo" }, NOW);

    expect(prismaMock.task.update.mock.calls[0][0].data).toEqual({ columnId: "todo", position: 1000, completedAt });
    expect(prismaMock.column.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "todo" }, data: { isDone: true } })
    );
  });

  it("deleting the done column with its tasks makes the last remaining column the done column", async () => {
    asRole(owner, done);
    prismaMock.column.findFirst.mockResolvedValue(null);

    await deleteColumn("demo", "done", { confirmName: "Done" }, NOW);

    expect(prismaMock.column.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doing" }, data: { isDone: true } })
    );
  });
});
