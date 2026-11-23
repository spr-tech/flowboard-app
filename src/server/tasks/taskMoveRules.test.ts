// @vitest-environment node
// Who may move cards, and where a personal mover's card lands.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { givenMembers, givenTask, person, taskRow, team } from "@/test/taskFixtures";
import { can, PermissionReason } from "@/utilities/helpers/permissions";
import { moveTask } from "./taskMove.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

/** The target column's other cards in the team order. */
const teamOrder = (...rows: [string, number][]) =>
  prismaMock.task.findMany.mockResolvedValue(rows.map(([id, position]) => ({ id, position })) as never);

const movedData = () => prismaMock.task.update.mock.calls.find(([args]) => args.where.id === "t1")?.[0].data;
const savedCardOrder = () => prismaMock.projectMember.update.mock.calls[0]?.[0].data.cardOrder;

beforeEach(() => resetPrismaMock());

describe("moveTask: members", () => {
  it("moves a task assigned to them to the TOP of the team order there, and where they dropped it in theirs", async () => {
    givenMembers({ ...team(), sam: { role: "MEMBER", cardOrder: { doing: ["c", "a", "b"], todo: ["t1", "x"] } } });
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder(["a", 1000], ["b", 2000], ["c", 3000]);

    // Dropped between a and b in sam's own order (c, a, b).
    await moveTask("sam", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "b" });

    expect(movedData()).toMatchObject({ columnId: "doing", position: 0 });
    expect(savedCardOrder()).toEqual({ doing: ["c", "a", "t1", "b"], todo: ["x"] });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({ action: "task.moved" });
  });

  it("with no personal order yet, follows the team order for the neighbours", async () => {
    givenMembers(team());
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder(["a", 1000], ["b", 2000]);

    await moveTask("sam", "t1", { columnId: "doing", afterTaskId: "b" });

    expect(savedCardOrder()).toEqual({ doing: ["a", "b", "t1"] });
    expect(movedData()).toMatchObject({ position: 0 });
  });

  it("can't move a task that isn't assigned to them, into any column, even the done column", async () => {
    givenMembers(team());
    for (const target of ["doing", "done"] as const) {
      givenTask(taskRow({ assignee: person("alex"), createdById: "sam" }), target);
      await expect(moveTask("sam", "t1", { columnId: target })).rejects.toMatchObject({
        status: 403,
        code: "TASK_FORBIDDEN",
        message: "You can only move tasks assigned to you.",
      });
    }
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it("can't reorder the team order within a column (that's their own card order)", async () => {
    givenMembers(team());
    givenTask(taskRow({ assignee: person("sam") }), "todo");
    teamOrder(["a", 1000]);

    await expect(moveTask("sam", "t1", { columnId: "todo", afterTaskId: "a" })).rejects.toMatchObject({
      status: 403,
      message: PermissionReason.reorderTeam,
    });
  });

  it("refuses neighbours that aren't next to each other in their own order", async () => {
    givenMembers({ ...team(), sam: { role: "MEMBER", cardOrder: { doing: ["b", "a"] } } });
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder(["a", 1000], ["b", 2000]);

    await expect(
      moveTask("sam", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "b" })
    ).rejects.toMatchObject({ status: 400, code: "INVALID_POSITION" });
  });
});

describe("moveTask: the owner and managers", () => {
  it("the owner's move lands exactly where dropped, and saves no personal order", async () => {
    givenMembers(team());
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder(["a", 1000], ["b", 2000]);

    await moveTask("alex", "t1", { columnId: "doing", afterTaskId: "a", beforeTaskId: "b" });

    expect(movedData()).toMatchObject({ position: 1500 });
    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
  });

  it("a manager with moveAnyTask moves anyone's task; without it, only their own", async () => {
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder();
    givenMembers(team({ moveAnyTask: true, teamOrder: true }));
    await expect(moveTask("kim", "t1", { columnId: "doing" })).resolves.toBeDefined();

    givenMembers(team({ moveAnyTask: false, teamOrder: true }));
    await expect(moveTask("kim", "t1", { columnId: "doing" })).rejects.toMatchObject({ status: 403 });
  });

  it("a manager without teamOrder moves like a member: top of the team order, their own order kept", async () => {
    givenMembers(team({ moveAnyTask: true, teamOrder: false }));
    givenTask(taskRow({ assignee: person("sam") }), "doing");
    teamOrder(["a", 1000]);

    await moveTask("kim", "t1", { columnId: "doing", afterTaskId: "a" });

    expect(movedData()).toMatchObject({ position: 0 });
    expect(savedCardOrder()).toEqual({ doing: ["a", "t1"] });
  });

  it("moves match can('task.move') for every role on someone else's task", async () => {
    const actors = [
      ["alex", team()],
      ["sam", team()],
      ["kim", team({ moveAnyTask: true })],
      ["kim", team({ moveAnyTask: false })],
    ] as const;
    for (const [actor, members] of actors) {
      resetPrismaMock();
      givenMembers(members);
      givenTask(taskRow({ assignee: person("zed") }), "doing");
      teamOrder();
      const role = members[actor];
      const allowed = can("task.move", {
        me: { id: actor },
        membership: { role: role.role, permissions: role.permissions as never },
        task: { createdById: "alex", assigneeId: "zed" },
      }).allowed;
      const outcome = moveTask(actor, "t1", { columnId: "doing" });
      if (allowed) await expect(outcome).resolves.toBeDefined();
      else await expect(outcome).rejects.toMatchObject({ status: 403 });
    }
  });
});
