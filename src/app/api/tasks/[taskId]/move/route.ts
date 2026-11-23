import { moveTaskSchema, taskParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { moveTask } from "@/server/tasks/taskMove.service";

/**
 * { columnId, afterTaskId?, beforeTaskId? }; the server works out the position. Members move only
 * tasks assigned to them, and their moves to another column land at the top of the team order.
 */
export const PATCH = route({ auth: true, params: taskParamsSchema, body: moveTaskSchema }, ({ user, params, body }) =>
  moveTask(user.id, params.taskId, body)
);
