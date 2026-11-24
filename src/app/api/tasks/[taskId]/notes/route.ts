import { createNoteSchema, taskParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { addNote, listNotes } from "@/server/tasks/taskNotes.service";

/** The task's notes, oldest first. */
export const GET = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  listNotes(user.id, params.taskId)
);

/** Anyone who can see the task adds a note. 201 with the note. */
export const POST = route(
  { auth: true, params: taskParamsSchema, body: createNoteSchema, status: 201 },
  ({ user, params, body }) => addNote(user.id, params.taskId, body.body)
);
