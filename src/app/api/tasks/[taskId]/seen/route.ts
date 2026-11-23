import { taskParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { markTaskSeen } from "@/server/tasks/taskTake.service";

/** The owner opened the task: clears its "New" badge. */
export const POST = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  markTaskSeen(user.id, params.taskId)
);
