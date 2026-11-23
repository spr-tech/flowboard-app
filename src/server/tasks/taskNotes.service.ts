// Notes on a task (docs/plan/04-api.md, "Notes"): anyone who can see the task adds one; the author
// deletes their own, the owner any. Notes are never edited. Adding writes task.note_added;
// deleting writes task.note_deleted with who deleted it and on which task, never the note's text.
import type { DeletedResponse, TaskNoteResponse } from "@/models/responses/boardResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { transaction } from "@/server/lib/transaction";
import { assertCan, permissionContext, requireMember } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { requireTaskAccess, taskContext } from "./taskShape";

const noteSelect = {
  id: true,
  taskId: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, image: true } },
} as const;

type NoteRow = { id: string; taskId: string; body: string; createdAt: Date; author: TaskNoteResponse["author"] };

const toNote = (note: NoteRow): TaskNoteResponse => ({ ...note, createdAt: note.createdAt.toISOString() });

const noteNotFound = () => new ApiError(404, "NOTE_NOT_FOUND", "We couldn't find that note.");

/** The task's notes, oldest first. */
export async function listNotes(userId: string, taskId: string): Promise<TaskNoteResponse[]> {
  await requireTaskAccess(prisma, userId, taskId);
  const notes = await prisma.taskNote.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
    select: noteSelect,
  });
  return notes.map(toNote);
}

export async function addNote(userId: string, taskId: string, body: string): Promise<TaskNoteResponse> {
  return transaction(async (tx) => {
    const { task, membership } = await requireTaskAccess(tx, userId, taskId);
    assertCan("note.add", taskContext(userId, membership, task));
    const note = await tx.taskNote.create({ data: { taskId, authorId: userId, body }, select: noteSelect });
    await tx.activity.create({
      data: {
        projectId: task.projectId,
        actorId: userId,
        action: ActivityAction.TaskNoteAdded,
        taskId,
        meta: { title: task.title },
      },
    });
    return toNote(note);
  });
}

/** The author, or the owner. A note in a project I'm not in is 404, like its task. */
export async function deleteNote(userId: string, noteId: string): Promise<DeletedResponse> {
  return transaction(async (tx) => {
    const note = await tx.taskNote.findUnique({
      where: { id: noteId },
      select: { id: true, authorId: true, task: { select: { id: true, title: true, projectId: true } } },
    });
    if (!note) throw noteNotFound();
    const membership = await requireMember(tx, userId, note.task.projectId).catch(() => {
      throw noteNotFound();
    });
    assertCan("note.delete", permissionContext(userId, membership, { note: { authorId: note.authorId } }));
    await tx.taskNote.delete({ where: { id: noteId } });
    await tx.activity.create({
      data: {
        projectId: note.task.projectId,
        actorId: userId,
        action: ActivityAction.TaskNoteDeleted,
        taskId: note.task.id,
        meta: { title: note.task.title, authorId: note.authorId },
      },
    });
    return { id: noteId };
  });
}
