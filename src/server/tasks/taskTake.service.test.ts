// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { givenMembers, givenTask, NOW, person, taskRow, team } from "@/test/taskFixtures";
import { markTaskSeen, takeTask } from "./taskTake.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

beforeEach(() => {
  resetPrismaMock();
  givenMembers(team());
  givenTask(taskRow());
  prismaMock.project.findUniqueOrThrow.mockResolvedValue({ memberTakeLimit: 3 } as never);
  prismaMock.task.updateMany.mockResolvedValue({ count: 1 });
});

describe("takeTask", () => {
  it("assigns an unassigned task to me, marks it taken, locks my row and writes task.taken", async () => {
    prismaMock.task.count.mockResolvedValue(2);

    await takeTask("sam", "t1", NOW);

    expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { id: "t1", assigneeId: null },
      data: { assigneeId: "sam", takenFromPoolAt: NOW },
    });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({
      action: "task.taken",
      actorId: "sam",
      taskId: "t1",
    });
  });

  it("counts only open tasks I took from the pool", async () => {
    prismaMock.task.count.mockResolvedValue(0);
    await takeTask("sam", "t1");
    expect(prismaMock.task.count).toHaveBeenCalledWith({
      where: {
        projectId: "p1",
        assigneeId: "sam",
        takenFromPoolAt: { not: null },
        column: { isDone: false },
      },
    });
  });

  it("refuses a member at the limit with 409 TAKE_LIMIT_REACHED and the message", async () => {
    prismaMock.task.count.mockResolvedValue(3);

    await expect(takeTask("sam", "t1")).rejects.toMatchObject({
      status: 409,
      code: "TAKE_LIMIT_REACHED",
      message: "You've taken 3 open tasks. Finish one first, or ask the owner to assign more.",
    });
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
  });

  it("has no limit for the owner or managers", async () => {
    prismaMock.task.count.mockResolvedValue(99);
    await expect(takeTask("alex", "t1")).resolves.toBeDefined();
    await expect(takeTask("kim", "t1")).resolves.toBeDefined();
  });

  it("refuses a task someone is on, including when they got there first (409 TASK_ALREADY_ASSIGNED)", async () => {
    givenTask(taskRow({ assignee: person("alex") }));
    await expect(takeTask("sam", "t1")).rejects.toMatchObject({ status: 409, code: "TASK_ALREADY_ASSIGNED" });

    givenTask(taskRow());
    prismaMock.task.count.mockResolvedValue(0);
    prismaMock.task.updateMany.mockResolvedValue({ count: 0 });
    await expect(takeTask("sam", "t1")).rejects.toMatchObject({ status: 409, code: "TASK_ALREADY_ASSIGNED" });
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("is 404 for a task in a project I'm not in", async () => {
    await expect(takeTask("stranger", "t1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("markTaskSeen", () => {
  it("the owner clears the 'New' badge once", async () => {
    givenTask(taskRow({ seenByOwnerAt: null, createdById: "sam" }));
    expect(await markTaskSeen("alex", "t1", NOW)).toMatchObject({ newForOwner: false });
    expect(prismaMock.task.update).toHaveBeenCalledWith(expect.objectContaining({ data: { seenByOwnerAt: NOW } }));
  });

  it("writes nothing when already seen", async () => {
    await markTaskSeen("alex", "t1", NOW);
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it("is the owner's alone", async () => {
    givenTask(taskRow({ seenByOwnerAt: null }));
    await expect(markTaskSeen("kim", "t1")).rejects.toMatchObject({ status: 403 });
    await expect(markTaskSeen("sam", "t1")).rejects.toMatchObject({ status: 403 });
  });
});
