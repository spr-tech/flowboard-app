import { dashboardQuerySchema } from "@/models/validations/dashboardValidation";
import { getDashboardProjects } from "@/server/dashboard/dashboard.service";
import { route } from "@/server/lib/route";

/** Up to 5 project progress rows. ?today=YYYY-MM-DD&tz=Area/City. */
export const GET = route({ auth: true, query: dashboardQuerySchema }, ({ user, query }) =>
  getDashboardProjects(user.id, query)
);
