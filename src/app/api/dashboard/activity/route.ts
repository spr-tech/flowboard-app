import { activityPageQuerySchema } from "@/models/validations/dashboardValidation";
import { getTeamActivity } from "@/server/activity/activity.service";
import { route } from "@/server/lib/route";

/**
 * One page of events across my projects, newest first: ?limit= (default 5) and ?cursor= (the
 * nextCursor of the page before). The browser polls the first page every 30 seconds.
 */
export const GET = route({ auth: true, query: activityPageQuerySchema }, ({ user, query }) =>
  getTeamActivity(user.id, query)
);
