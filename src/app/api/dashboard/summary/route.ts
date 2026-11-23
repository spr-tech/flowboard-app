import { dashboardQuerySchema } from "@/models/validations/dashboardValidation";
import { getSummary } from "@/server/dashboard/dashboard.service";
import { route } from "@/server/lib/route";

/** The greeting, the summary line and the four stat cards. ?today=YYYY-MM-DD&tz=Area/City. */
export const GET = route({ auth: true, query: dashboardQuerySchema }, ({ user, query }) => getSummary(user.id, query));
