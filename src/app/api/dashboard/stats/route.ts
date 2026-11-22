import { dashboardQuerySchema } from "@/models/validations/dashboardValidation";
import { getStats } from "@/server/dashboard/dashboard.service";
import { route } from "@/server/lib/route";

/** Completed per day (14 days), open work by priority, the next 7 days. ?today=…&tz=…. */
export const GET = route({ auth: true, query: dashboardQuerySchema }, ({ user, query }) => getStats(user.id, query));
