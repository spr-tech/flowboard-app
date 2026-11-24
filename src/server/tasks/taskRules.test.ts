// @vitest-environment node
// Who may create, edit and delete tasks: the member rules, managers' switches, and the server
// agreeing with can() for every role and kind of task.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { ALL_OFF, ALL_ON, givenMembers, givenTask, NOW, person, taskRow, team } from "@/test/taskFixtures";
import { can, PermissionReason, type PermissionAction } from "@/utilities/helpers/permissions";
import { createTask, deleteTask, updateTask, type TaskChanges } from "./tasks.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const LONG = "The checkout button does nothing on Safari, customers can't pay.";

beforeEach(() => {
  resetPrismaMock();
  prismaMock.column.findFirst.mockResolvedValue({ id: "todo", name: "To do", isDone: false } as never);
  prismaMock.task.findFirst.mockResolvedValue(null);
  prismaMock.task.create.mockImplementation(((args: { data: Record<string, unknown> }) =>
    Promise.resolve(taskRow(args.data))) as never);
});

describe("createTask: members", () => {
  it("assigns a member's task to them, keeps the description and due date, and waits for the owner", async () => {
    givenMembers(team());
    await createTask(
      "sam",
      "p1",
      { title: "Fix pay", columnId: "todo", description: LONG, dueDate: "2026-12-01" },
      NOW
    );

    expect(prismaMock.task.create.mock.calls[0][0].data).toMatchObject({
      assigneeId: "sam",
      description: LONG,
      dueDate: new Date("2026-12-01T00:00:00.000Z"),
      createdById: "sam",
      seenByOwnerAt: null,
    });
  });

  it("needs a description of at least 20 characters (403 TASK_FORBIDDEN with a field message)", async () => {
    givenMembers(team());
    for (const description of [undefined, "", "  Nineteen chars ok  ", "Too short to say"]) {
      await expect(createTask("sam", "p1", { title: "Fix", columnId: "todo", description })).rejects.toMatchObject({
        status: 403,
        code: "TASK_FORBIDDEN",
        fields: { description: "Write at least 20 characters" },
      });
    }
    expect(prismaMock.task.create).not.toHaveBeenCalled();
  });

  it("refuses another assignee for a member, and for a manager without createAndAssign", async () => {
    givenMembers(team({ createAndAssign: false }));
    for (const actor of ["sam", "kim"]) {
      await expect(
        createTask(actor, "p1", { title: "Fix", columnId: "todo", description: LONG, assigneeId: "alex" })
      ).rejects.toMatchObject({ status: 403, code: "TASK_FORBIDDEN", message: PermissionReason.assignOthers });
    }
  });

  it("lets the owner and managers with createAndAssign add a title only, unassigned, already seen", async () => {
    givenMembers(team());
    for (const actor of ["alex", "kim"]) {
      await createTask(actor, "p1", { title: "Quick", columnId: "todo" }, NOW);
    }
    for (const [args] of prismaMock.task.create.mock.calls) {
      expect(args.data).toMatchObject({ assigneeId: null, description: null, seenByOwnerAt: NOW });
    }
  });

  it("a manager's task is never 'New', even when they create it under the member rule", async () => {
    givenMembers(team({ createAndAssign: false }));
    await createTask("kim", "p1", { title: "Fix", columnId: "todo", description: LONG }, NOW);
    expect(prismaMock.task.create.mock.calls[0][0].data).toMatchObject({ assigneeId: "kim", seenByOwnerAt: NOW });
  });
});

describe("updateTask: member rules", () => {
  it("a member edits title, description and priority on a task they created", async () => {
    givenMembers(team());
    givenTask(taskRow({ createdById: "sam", assignee: person("sam"), description: LONG }));

    await updateTask("sam", "t1", { title: "New title", priority: "HIGH", description: `${LONG} More.` });

    expect(prismaMock.task.update).toHaveBeenCalledTimes(1);
  });

  it("but never the due date, and the description stays 20+ characters", async () => {
    givenMembers(team());
    givenTask(taskRow({ createdById: "sam", assignee: person("sam"), description: LONG }));

    await expect(updateTask("sam", "t1", { dueDate: "2026-12-24" })).rejects.toMatchObject({
      status: 403,
      message: PermissionReason.dueDateLocked,
    });
    await expect(updateTask("sam", "t1", { description: "short" })).rejects.toMatchObject({
      status: 403,
      fields: { description: "Write at least 20 characters" },
    });
    expect(prismaMock.task.update).not.toHaveBeenCalled();
  });

  it("a task assigned to a member (or taken) is locked; unchanged values still pass", async () => {
    givenMembers(team());
    givenTask(taskRow({ createdById: "alex", assignee: person("sam"), takenFromPoolAt: NOW }));

    await expect(updateTask("sam", "t1", { title: "Mine now" })).rejects.toMatchObject({
      status: 403,
      code: "TASK_FORBIDDEN",
      message: PermissionReason.editLocked,
    });
    await expect(updateTask("sam", "t1", { title: "Fix login" })).resolves.toMatchObject({ title: "Fix login" });
  });

  it("members can't unassign themselves or assign anyone", async () => {
    givenMembers(team());
    givenTask(taskRow({ createdById: "sam", assignee: person("sam") }));
    await expect(updateTask("sam", "t1", { assigneeId: null })).rejects.toMatchObject({ status: 403 });
    await expect(updateTask("sam", "t1", { assigneeId: "alex" })).rejects.toMatchObject({ status: 403 });
  });

  it("the owner reassigning a taken task clears takenFromPoolAt", async () => {
    givenMembers(team());
    givenTask(taskRow({ assignee: person("sam"), takenFromPoolAt: NOW }));

    await updateTask("alex", "t1", { assigneeId: "kim" });

    expect(prismaMock.task.update.mock.calls[0][0].data).toEqual({ assigneeId: "kim", takenFromPoolAt: null });
  });

  it("a manager with editAnyTask edits any field, including the due date; without it, the member rule", async () => {
    givenTask(taskRow({ createdById: "alex", assignee: person("alex") }));
    givenMembers(team({ editAnyTask: true }));
    await expect(updateTask("kim", "t1", { dueDate: "2026-12-24", title: "Better" })).resolves.toBeDefined();

    givenMembers(team({ editAnyTask: false }));
    await expect(updateTask("kim", "t1", { title: "Again" })).rejects.toMatchObject({ status: 403 });
  });
});

describe("deleteTask", () => {
  it("members delete only tasks they created", async () => {
    givenMembers(team());
    givenTask(taskRow({ createdById: "sam" }));
    await expect(deleteTask("sam", "t1")).resolves.toEqual({ id: "t1" });

    givenTask(taskRow({ createdById: "alex", assignee: person("sam") }));
    await expect(deleteTask("sam", "t1")).rejects.toMatchObject({ status: 403, message: PermissionReason.delete });
  });

  it("managers need deleteAnyTask for someone else's task", async () => {
    givenTask(taskRow({ createdById: "alex" }));
    givenMembers(team({ deleteAnyTask: false }));
    await expect(deleteTask("kim", "t1")).rejects.toMatchObject({ status: 403 });
    givenMembers(team({ deleteAnyTask: true }));
    await expect(deleteTask("kim", "t1")).resolves.toEqual({ id: "t1" });
  });
});

describe("the server agrees with can()", () => {
  const actors = {
    owner: { id: "alex", members: team() },
    member: { id: "sam", members: team() },
    managerAllOn: { id: "kim", members: team(ALL_ON) },
    managerAllOff: { id: "kim", members: team(ALL_OFF) },
  };
  const tasks = {
    created: (me: string) => taskRow({ createdById: me, assignee: person(me), description: LONG }),
    assigned: (me: string) => taskRow({ createdById: "zed", assignee: person(me) }),
    others: () => taskRow({ createdById: "zed", assignee: person("zed") }),
  };
  const edits: [PermissionAction, TaskChanges][] = [
    ["task.editTitle", { title: "Changed" }],
    ["task.editDescription", { description: `${LONG} Changed.` }],
    ["task.editPriority", { priority: "HIGH" }],
    ["task.editDueDate", { dueDate: "2026-12-24" }],
  ];

  for (const [actorName, actor] of Object.entries(actors)) {
    for (const [taskName, makeTask] of Object.entries(tasks)) {
      const row = makeTask(actor.id);
      const role = actor.members[actor.id];
      const ctx = {
        me: { id: actor.id },
        membership: { role: role.role, permissions: role.permissions as never },
        task: {
          createdById: row.createdById as string,
          assigneeId: (row.assignee as { id: string } | null)?.id ?? null,
        },
      };

      it(`${actorName} on a ${taskName} task: edits and delete match can()`, async () => {
        givenMembers(actor.members);
        for (const [action, change] of edits) {
          givenTask(row);
          const outcome = updateTask(actor.id, "t1", change);
          if (can(action, ctx).allowed) await expect(outcome).resolves.toBeDefined();
          else await expect(outcome).rejects.toMatchObject({ status: 403 });
        }
        givenTask(row);
        const deleted = deleteTask(actor.id, "t1");
        if (can("task.delete", ctx).allowed) await expect(deleted).resolves.toEqual({ id: "t1" });
        else await expect(deleted).rejects.toMatchObject({ status: 403 });
      });
    }
  }
});
