import { taskParamsSchema, updateTaskSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { deleteTask, updateTask } from "@/server/tasks/tasks.service";

/** Any member: title, description, priority, assignee, due date. */
export const PATCH = route({ auth: true, params: taskParamsSchema, body: updateTaskSchema }, ({ user, params, body }) =>
  updateTask(user.id, params.taskId, body)
);

/** Any member: delete the task (its activity stays). */
export const DELETE = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  deleteTask(user.id, params.taskId)
);
