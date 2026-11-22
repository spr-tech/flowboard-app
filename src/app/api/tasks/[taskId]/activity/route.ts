import { taskParamsSchema } from "@/models/validations/boardValidation";
import { getTaskActivity } from "@/server/activity/activity.service";
import { route } from "@/server/lib/route";

/** One task's newest 20 events, for the task drawer (members only, else 404). */
export const GET = route({ auth: true, params: taskParamsSchema }, ({ user, params }) =>
  getTaskActivity(user.id, params.taskId)
);
