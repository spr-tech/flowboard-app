import { taskParamsSchema } from "@/models/validations/boardValidation";
import { route } from "@/server/lib/route";
import { takeTask } from "@/server/tasks/taskTake.service";

/** "Assign to me": take an unassigned task (members: up to the project's take limit). */
export const POST = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  takeTask(user.id, params.taskId)
);
