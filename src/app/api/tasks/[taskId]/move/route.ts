import { moveTaskSchema, taskParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { moveTask } from "@/server/tasks/tasks.service";

/** Any member: { columnId, afterTaskId?, beforeTaskId? }. The server works out the position. */
export const PATCH = route({ auth: true, params: taskParamsSchema, body: moveTaskSchema }, ({ user, params, body }) =>
  moveTask(user.id, params.taskId, body)
);
