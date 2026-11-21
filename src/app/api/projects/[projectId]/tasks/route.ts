import { createTaskSchema } from "@/models/validations/boardValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { route } from "@/server/lib/route";
import { createTask } from "@/server/tasks/tasks.service";

/** Any member: a new task at the bottom of a column. 201 with the task. */
export const POST = route(
  { auth: true, params: projectParamsSchema, body: createTaskSchema, status: 201 },
  ({ user, params, body }) => createTask(user.id, params.projectId, body)
);
