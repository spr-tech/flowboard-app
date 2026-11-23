import { createTaskSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { route } from "@/server/lib/route";
import { createTask } from "@/server/tasks/tasks.service";

/** A new task at the bottom of a column (members: assigned to them, 20+ character description). 201. */
export const POST = route(
  { auth: true, params: projectParamsSchema, body: createTaskSchema, status: 201 },
  ({ user, params, body }) => createTask(user.id, params.projectId, body)
);
