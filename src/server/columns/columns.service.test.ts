// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { createColumn, deleteColumn, updateColumn } from "./columns.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const NOW = new Date("2026-11-22T10:00:00Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW } as const;
const member = { ...owner, role: "MEMBER" } as const;

const col = (id: string, name: string, position: number, isDone = false) => ({
  id,
  projectId: "p1",
  name,
  position,
  isDone,
});
const todo = col("todo", "To do", 1000);
const doing = col("doing", "In progress", 2000);
const done = col("done", "Done", 3000, true);

/** Column and task writes in the order they happened, to check the done flag is cleared before it's set. */
let writeLog: unknown[] = [];

function asRole(role: typeof owner | typeof member, column = doing, board = [todo, doing, done]) {
  prismaMock.column.findUnique.mockResolvedValue(column as never);
  prismaMock.projectMember.findUnique.mockResolvedValue(role as never);
  prismaMock.column.findMany.mockResolvedValue(board as never);
  prismaMock.column.update.mockImplementation(((args: { where: { id: string }; data: object }) => {
    writeLog.push(args);
    return Promise.resolve({ ...[todo, doing, done].find((c) => c.id === args.where.id), ...args.data });
  }) as never);
  prismaMock.task.updateMany.mockImplementation(((args: unknown) => {
    writeLog.push(args);
    return Promise.resolve({ count: 1 });
  }) as never);
  prismaMock.task.count.mockResolvedValue(0);
}

beforeEach(() => {
  resetPrismaMock();
  writeLog = [];
});

describe("owner only", () => {
  it("answers 403 to a member and 404 to a non-member or a missing column", async () => {
    asRole(member);
    await expect(updateColumn("u2", "doing", { name: "X" })).rejects.toMatchObject({ status: 403, code: "OWNER_ONLY" });

    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    await expect(updateColumn("stranger", "doing", { name: "X" })).rejects.toMatchObject({
      status: 404,
      code: "COLUMN_NOT_FOUND",
    });

    prismaMock.column.findUnique.mockResolvedValue(null);
    await expect(deleteColumn("u1", "nope", { moveTasksTo: "todo" })).rejects.toMatchObject({ status: 404 });
  });

  it("refuses a member creating a column", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);
    await expect(createColumn("u2", "p1", { name: "Review" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("createColumn", () => {
  it("inserts the new column just before the done column, with a column.created row", async () => {
    asRole(owner);
    prismaMock.column.create.mockImplementation(((args: { data: object }) =>
      Promise.resolve({ id: "new", projectId: "p1", isDone: false, ...args.data })) as never);

    const created = await createColumn("u1", "p1", { name: "Review" });

    expect(prismaMock.column.create.mock.calls[0][0].data).toEqual({ projectId: "p1", name: "Review", position: 2500 });
    expect(created).toMatchObject({ name: "Review", position: 2500, isDone: false, taskCount: 0 });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({ action: "column.created" });
  });
});

describe("updateColumn", () => {
  it("renames, with from and to in a column.renamed row", async () => {
    asRole(owner);

    const column = await updateColumn("u1", "doing", { name: "Doing" });

    expect(column.name).toBe("Doing");
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "column.renamed",
      meta: { from: "In progress", to: "Doing" },
    });
  });

  it("moves one place by swapping positions with the neighbour", async () => {
    asRole(owner);

    const column = await updateColumn("u1", "doing", { move: "left" });

    expect(prismaMock.column.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "todo" }, data: { position: 2000 } })
    );
    expect(column.position).toBe(1000);
  });

  it("won't move the first column further left", async () => {
    asRole(owner, todo);
    await expect(updateColumn("u1", "todo", { move: "left" })).rejects.toMatchObject({ code: "CANNOT_MOVE" });
  });

  it("switches the done column: clears the old flag first, uncompletes its tasks, completes the new one's", async () => {
    asRole(owner);
    prismaMock.column.findFirst.mockResolvedValue({ id: "done", name: "Done" } as never);

    const column = await updateColumn("u1", "doing", { isDone: true }, NOW);

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

describe("deleteColumn", () => {
  it("never deletes the last column", async () => {
    asRole(owner, todo, [todo]);

    await expect(deleteColumn("u1", "todo", { moveTasksTo: "x" })).rejects.toMatchObject({
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

    expect(await deleteColumn("u1", "doing", { moveTasksTo: "todo" }, NOW)).toEqual({ id: "doing" });

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

  it("refuses moving the tasks into the column being deleted", async () => {
    asRole(owner);
    await expect(deleteColumn("u1", "doing", { moveTasksTo: "doing" })).rejects.toMatchObject({
      status: 400,
      fields: { moveTasksTo: "Pick another column on this board" },
    });
  });

  it("deletes the column with its tasks only when the exact name is typed", async () => {
    asRole(owner);
    await expect(deleteColumn("u1", "doing", { confirmName: "in progress" })).rejects.toMatchObject({
      status: 400,
      code: "NAME_MISMATCH",
    });
    expect(prismaMock.column.delete).not.toHaveBeenCalled();

    prismaMock.task.count.mockResolvedValue(3);
    await deleteColumn("u1", "doing", { confirmName: "In progress" });
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(prismaMock.column.delete).toHaveBeenCalledWith({ where: { id: "doing" } });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({ meta: { deletedTaskCount: 3 } });
  });

  it("deleting the done column hands the flag to the column the tasks went to, keeping them completed", async () => {
    const completedAt = new Date("2026-11-20T00:00:00Z");
    asRole(owner, done);
    prismaMock.task.findMany.mockResolvedValue([{ id: "a", completedAt }] as never);
    prismaMock.task.findFirst.mockResolvedValue(null);
    prismaMock.column.findFirst.mockResolvedValue(null); // the old done column is already gone

    await deleteColumn("u1", "done", { moveTasksTo: "todo" }, NOW);

    expect(prismaMock.task.update.mock.calls[0][0].data).toEqual({ columnId: "todo", position: 1000, completedAt });
    expect(prismaMock.column.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "todo" }, data: { isDone: true } })
    );
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { columnId: "todo", completedAt: null },
      data: { completedAt: NOW },
    });
  });

  it("deleting the done column with its tasks makes the last remaining column the done column", async () => {
    asRole(owner, done);
    prismaMock.column.findFirst.mockResolvedValue(null);

    await deleteColumn("u1", "done", { confirmName: "Done" }, NOW);

    expect(prismaMock.column.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "doing" }, data: { isDone: true } })
    );
  });
});
