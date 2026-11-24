import { noteParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { deleteNote } from "@/server/tasks/taskNotes.service";

/** The author deletes their own note; the owner deletes any. */
export const DELETE = route({ auth: true, params: noteParamsSchema }, ({ user, params }) =>
  deleteNote(user.id, params.noteId)
);
