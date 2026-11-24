// @vitest-environment node
// A member's own card order, and notes on tasks.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";
import { resetColumnOrder } from "@/server/columns/columnOrder.service";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { givenMembers, givenTask, NOW, person, taskRow, team } from "@/test/taskFixtures";
import { setCardOrder } from "./cardOrder.service";
import { addNote, deleteNote, listNotes } from "./taskNotes.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

beforeEach(() => resetPrismaMock());

describe("setCardOrder", () => {
  it("saves a member's order for one column, keeping their other columns", async () => {
    givenMembers({ ...team(), sam: { role: "MEMBER", cardOrder: { done: ["z"] } } });
    prismaMock.task.count.mockResolvedValue(2);

    expect(await setCardOrder("sam", "p1", "todo", ["b", "a"])).toEqual({
      projectId: "p1",
      cardOrder: { done: ["z"], todo: ["b", "a"] },
    });
    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { cardOrder: { done: ["z"], todo: ["b", "a"] } } })
    );
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("refuses the owner and managers who change the team order (400 USES_TEAM_ORDER)", async () => {
    givenMembers(team({ teamOrder: true }));
    for (const actor of ["alex", "kim"]) {
      await expect(setCardOrder(actor, "p1", "todo", [])).rejects.toMatchObject({ code: "USES_TEAM_ORDER" });
    }
  });

  it("lets a manager without teamOrder keep their own order", async () => {
    givenMembers(team({ teamOrder: false }));
    prismaMock.task.count.mockResolvedValue(1);
    await expect(setCardOrder("kim", "p1", "todo", ["a"])).resolves.toMatchObject({ cardOrder: { todo: ["a"] } });
  });

  it("refuses a card that isn't in that column (400 UNKNOWN_TASK)", async () => {
    givenMembers(team());
    prismaMock.task.count.mockResolvedValue(1);
    await expect(setCardOrder("sam", "p1", "todo", ["a", "elsewhere"])).rejects.toMatchObject({
      status: 400,
      code: "UNKNOWN_TASK",
    });
  });

  it("'Reset to team order' clears both the column and the card order", async () => {
    givenMembers(team());
    await resetColumnOrder("sam", "p1");
    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { columnOrder: Prisma.DbNull, cardOrder: Prisma.DbNull } })
    );
  });
});

const note = (authorId: string) => ({
  id: "n1",
  authorId,
  task: { id: "t1", title: "Fix login", projectId: "p1" },
});

describe("notes", () => {
  it("anyone on the project adds a note, with a task.note_added row", async () => {
    givenMembers(team());
    givenTask(taskRow({ assignee: person("alex") }));
    prismaMock.taskNote.create.mockResolvedValue({
      id: "n1",
      taskId: "t1",
      body: "Tried on Safari 17",
      createdAt: NOW,
      author: person("sam"),
    } as never);

    expect(await addNote("sam", "t1", "Tried on Safari 17")).toMatchObject({
      body: "Tried on Safari 17",
      createdAt: NOW.toISOString(),
      author: { id: "sam" },
    });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toMatchObject({ action: "task.note_added", taskId: "t1" });
  });

  it("lists notes oldest first, and 404s for a task in a project I'm not in", async () => {
    givenMembers(team());
    givenTask();
    prismaMock.taskNote.findMany.mockResolvedValue([]);
    await listNotes("sam", "t1");
    expect(prismaMock.taskNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: "asc" } })
    );
    await expect(listNotes("stranger", "t1")).rejects.toMatchObject({ status: 404 });
  });

  it("authors delete their own; task.note_deleted records who and which task, never the text", async () => {
    givenMembers(team());
    prismaMock.taskNote.findUnique.mockResolvedValue(note("sam") as never);

    await deleteNote("sam", "n1");

    expect(prismaMock.taskNote.delete).toHaveBeenCalledWith({ where: { id: "n1" } });
    expect(prismaMock.activity.create.mock.calls[0][0].data).toEqual({
      projectId: "p1",
      actorId: "sam",
      action: "task.note_deleted",
      taskId: "t1",
      meta: { title: "Fix login", authorId: "sam" },
    });
  });

  it("the owner deletes any note; others (managers included) get 403", async () => {
    givenMembers(team());
    prismaMock.taskNote.findUnique.mockResolvedValue(note("sam") as never);
    await expect(deleteNote("kim", "n1")).rejects.toMatchObject({
      status: 403,
      message: "You can only delete your own notes.",
    });
    await expect(deleteNote("alex", "n1")).resolves.toEqual({ id: "n1" });
  });

  it("is 404 for an unknown note or one in a project I'm not in", async () => {
    givenMembers(team());
    prismaMock.taskNote.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(note("sam") as never);
    await expect(deleteNote("sam", "nope")).rejects.toMatchObject({ status: 404, code: "NOTE_NOT_FOUND" });
    await expect(deleteNote("stranger", "n1")).rejects.toMatchObject({ status: 404, code: "NOTE_NOT_FOUND" });
  });
});
