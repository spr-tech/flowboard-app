import { taskParamsSchema, updateTaskSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { deleteTask, updateTask } from "@/server/tasks/tasks.service";

/** Title, description, priority, assignee, due date: each field as can() allows (403 TASK_FORBIDDEN). */
export const PATCH = route({ auth: true, params: taskParamsSchema, body: updateTaskSchema }, ({ user, params, body }) =>
  updateTask(user.id, params.taskId, body)
);

/** Delete the task (members: only tasks they created). Its activity stays. */
export const DELETE = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  deleteTask(user.id, params.taskId)
);
