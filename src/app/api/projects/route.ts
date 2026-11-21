import { createProjectSchema, listProjectsQuerySchema } from "@/models/validations/projectValidation";
import { createProject, listProjects } from "@/server/projects/projects.service";
import { route } from "@/server/lib/route";

/** My projects as cards. ?today=YYYY-MM-DD is the viewer's own day, for overdue and next due. */
export const GET = route({ auth: true, query: listProjectsQuerySchema }, ({ user, query }) =>
  listProjects(user.id, query.today)
);

/** New project with me as OWNER and the 3 default columns. 201 with the project. */
export const POST = route({ auth: true, body: createProjectSchema, status: 201 }, ({ user, body }) =>
  createProject(user.id, body)
);
