// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { moveTask } from "./taskMove.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const NOW = new Date("2026-11-22T10:00:00Z");
const owner = { role: "OWNER", permissions: null, pinnedAt: null, lastOpenedAt: null, joinedAt: NOW } as const;

function taskRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "t1",
    projectId: "p1",
    columnId: "todo",
    title: "Fix login",
    description: null,
    priority: "MEDIUM",
    position: 1000,
    dueDate: null,
    completedAt: null,
    createdAt: NOW,
    assignee: null,
    createdById: "u1",
    takenFromPoolAt: null,
    seenByOwnerAt: NOW,
    ...overrides,
  };
}

const columns = {
  todo: { id: "todo", name: "To do", isDone: false },
  doing: { id: "doing", name: "In progress", isDone: false },
  done: { id: "done", name: "Done", isDone: true },
} as const;

/** The task exists, I'm a member, and the given column is on the board. */
function givenTask(task = taskRow(), target: keyof typeof columns = "doing") {
  prismaMock.task.findUnique.mockResolvedValue(task as never);
  prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
  prismaMock.column.findFirst.mockResolvedValue(columns[target] as never);
  prismaMock.column.findUnique.mockResolvedValue({ name: "To do" } as never);
  prismaMock.task.update.mockImplementation(((args: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...task, ...args.data })) as never);
}

/** The target column's other tasks, top to bottom. */
const neighbours = (...rows: [string, number][]) =>
  prismaMock.task.findMany.mockResolvedValue(rows.map(([id, position]) => ({ id, position })) as never);

const movedData = () => {
  const call = prismaMock.task.update.mock.calls.find(([args]) => args.where.id === "t1");
  return call?.[0].data;
};

beforeEach(() => resetPrismaMock());

describe("moveTask", () => {
  it("lands between two neighbours at their midpoint, using their positions from the database", async () => {
    givenTask();
    neighbours(["a", 1000], ["b", 2000]);

    const moved = await moveTask("u1", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "b" }, NOW);

    expect(movedData()).toEqual({ columnId: "doing", position: 1500, completedAt: null });
    expect(moved.position).toBe(1500);
  });

  it("goes 1000 above the first card at the top, and 1000 below the last at the bottom", async () => {
    givenTask();
    neighbours(["a", 1000], ["b", 2000]);
    await moveTask("u1", "t1", { columnId: "doing", beforeTaskId: "a" }, NOW);
    expect(movedData()?.position).toBe(0);

    resetPrismaMock();
    givenTask();
    neighbours(["a", 1000], ["b", 2000]);
    await moveTask("u1", "t1", { columnId: "doing", afterTaskId: "b" }, NOW);
    expect(movedData()?.position).toBe(3000);
  });

  it("starts an empty column at 1000, and goes to the bottom when no neighbour is given", async () => {
    givenTask();
    neighbours();
    await moveTask("u1", "t1", { columnId: "doing" }, NOW);
    expect(movedData()?.position).toBe(1000);

    resetPrismaMock();
    givenTask();
    neighbours(["a", 1000], ["b", 5000]);
    await moveTask("u1", "t1", { columnId: "doing" }, NOW);
    expect(movedData()?.position).toBe(6000);
  });

  it("re-spaces the column first when the gap is too small, then takes the new midpoint", async () => {
    givenTask();
    neighbours(["a", 1000], ["b", 1000.0001], ["c", 3000]);

    await moveTask("u1", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "b" }, NOW);

    const respaced = prismaMock.task.update.mock.calls
      .filter(([args]) => args.where.id !== "t1")
      .map(([args]) => [args.where.id, args.data.position]);
    expect(respaced).toEqual([
      ["a", 1000],
      ["b", 2000],
      ["c", 3000],
    ]);
    expect(movedData()?.position).toBe(1500);
  });

  it("sets completedAt moving into the done column and writes one task.completed row", async () => {
    givenTask(taskRow(), "done");
    neighbours();

    await moveTask("u1", "t1", { columnId: "done" }, NOW);

    expect(movedData()?.completedAt).toEqual(NOW);
    expect(prismaMock.activity.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        actorId: "u1",
        action: "task.completed",
        taskId: "t1",
        meta: { title: "Fix login", from: "To do", to: "Done" },
      },
    });
  });

  it("clears completedAt moving out of the done column, and writes task.moved", async () => {
    givenTask(taskRow({ columnId: "done", completedAt: new Date("2026-11-20T00:00:00Z") }), "doing");
    neighbours();

    await moveTask("u1", "t1", { columnId: "doing" }, NOW);

    expect(movedData()?.completedAt).toBeNull();
    expect(prismaMock.activity.create.mock.calls[0][0].data.action).toBe("task.moved");
  });

  it("keeps the completion time and writes no Activity when only reordering within the done column", async () => {
    const completedAt = new Date("2026-11-20T00:00:00Z");
    givenTask(taskRow({ columnId: "done", completedAt }), "done");
    neighbours(["a", 1000]);

    await moveTask("u1", "t1", { columnId: "done", beforeTaskId: "a" }, NOW);

    expect(movedData()?.completedAt).toEqual(completedAt);
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("refuses a neighbour that isn't in the target column, or neighbours that aren't next to each other", async () => {
    givenTask();
    neighbours(["a", 1000], ["b", 2000], ["c", 3000]);
    await expect(moveTask("u1", "t1", { columnId: "doing", afterTaskId: "zzz" }, NOW)).rejects.toMatchObject({
      status: 400,
      code: "INVALID_POSITION",
    });
    await expect(
      moveTask("u1", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "c" }, NOW)
    ).rejects.toMatchObject({ status: 400, code: "INVALID_POSITION" });
  });

  it("refuses a column from another project with 400", async () => {
    givenTask();
    prismaMock.column.findFirst.mockResolvedValue(null);

    await expect(moveTask("u1", "t1", { columnId: "elsewhere" }, NOW)).rejects.toMatchObject({
      status: 400,
      code: "COLUMN_NOT_FOUND",
    });
  });

  it("answers 404 for a task in a project I'm not in, as if it didn't exist", async () => {
    prismaMock.task.findUnique.mockResolvedValue(taskRow() as never);
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(moveTask("stranger", "t1", { columnId: "doing" }, NOW)).rejects.toMatchObject({
      status: 404,
      code: "TASK_NOT_FOUND",
    });
  });
});
