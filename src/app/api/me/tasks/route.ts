import { myTasksQuerySchema } from "@/models/validations/dashboardValidation";
import { getMyTasks } from "@/server/dashboard/dashboard.service";
import { route } from "@/server/lib/route";

/** My tasks grouped by due date. ?group=due&today=YYYY-MM-DD&tz=Area/City. */
export const GET = route({ auth: true, query: myTasksQuerySchema }, ({ user, query }) => getMyTasks(user.id, query));
