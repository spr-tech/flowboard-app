// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { createTask, deleteTask, updateTask } from "./tasks.service";

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

beforeEach(() => resetPrismaMock());

describe("createTask", () => {
  it("adds the task at the bottom, MEDIUM and unassigned by default, with a task.created row", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.column.findFirst.mockResolvedValue(columns.todo as never);
    prismaMock.task.findFirst.mockResolvedValue({ position: 4000 } as never);
    prismaMock.task.create.mockResolvedValue(taskRow({ position: 5000 }) as never);

    const task = await createTask("u1", "p1", { title: "Fix login", columnId: "todo" }, NOW);

    expect(prismaMock.task.create.mock.calls[0][0].data).toEqual({
      projectId: "p1",
      columnId: "todo",
      title: "Fix login",
      description: null,
      dueDate: null,
      assigneeId: null,
      position: 5000,
      createdById: "u1",
      completedAt: null,
      seenByOwnerAt: NOW,
    });
    expect(task).toMatchObject({ priority: "MEDIUM", assignee: null, position: 5000 });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "task.created",
      meta: { title: "Fix login", column: "To do" },
    });
  });

  it("completes a task added straight into the done column", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.column.findFirst.mockResolvedValue(columns.done as never);
    prismaMock.task.findFirst.mockResolvedValue(null);
    prismaMock.task.create.mockResolvedValue(taskRow() as never);

    await createTask("u1", "p1", { title: "Ship", columnId: "done" }, NOW);

    expect(prismaMock.task.create.mock.calls[0][0].data).toMatchObject({ position: 1000, completedAt: NOW });
  });
});

describe("updateTask", () => {
  it("writes only the fields that changed, with the field names in a task.updated row", async () => {
    givenTask();

    await updateTask("u1", "t1", { title: "Fix login", priority: "HIGH", dueDate: "2026-11-30", description: "  " });

    expect(prismaMock.task.update.mock.calls[0][0].data).toEqual({
      priority: "HIGH",
      dueDate: new Date("2026-11-30T00:00:00.000Z"),
    });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "task.updated",
      meta: { title: "Fix login", fields: ["priority", "dueDate"] },
    });
  });

  it("writes nothing when nothing changed", async () => {
    givenTask();

    const task = await updateTask("u1", "t1", { title: "Fix login", description: null });

    expect(task.title).toBe("Fix login");
    expect(prismaMock.task.update).not.toHaveBeenCalled();
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("records the new assignee's name, so the feed can say who it was assigned to", async () => {
    givenTask();
    prismaMock.task.update.mockResolvedValue({
      ...taskRow(),
      assignee: { id: "sam", name: "Sam", image: null },
    } as never);

    await updateTask("u1", "t1", { assigneeId: "sam" });

    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "task.updated",
      meta: { fields: ["assigneeId"], assignee: { id: "sam", name: "Sam" } },
    });
  });

  it("only assigns project members", async () => {
    givenTask();
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(owner as never).mockResolvedValueOnce(null);

    await expect(updateTask("u1", "t1", { assigneeId: "outsider" })).rejects.toMatchObject({
      status: 400,
      code: "ASSIGNEE_NOT_MEMBER",
      fields: { assigneeId: "Pick someone on this project" },
    });
  });
});

describe("deleteTask", () => {
  it("records task.deleted with the title, then deletes", async () => {
    givenTask();

    expect(await deleteTask("u1", "t1")).toEqual({ id: "t1" });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "task.deleted",
      meta: { title: "Fix login" },
    });
    expect(prismaMock.task.delete).toHaveBeenCalledWith({ where: { id: "t1" } });
  });
});
