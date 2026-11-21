import { deleteProjectSchema, projectParamsSchema, updateProjectSchema } from "@/models/validations/projectValidation";
import { deleteProject, getProject, updateProject } from "@/server/projects/projects.service";
import { route } from "@/server/lib/route";

/** The project with its columns and my role (404 for non-members). Also records the visit. */
export const GET = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  getProject(user.id, params.projectId)
);

/** Owner: rename and/or recolour. */
export const PATCH = route(
  { auth: true, params: projectParamsSchema, body: updateProjectSchema },
  ({ user, params, body }) => updateProject(user.id, params.projectId, body)
);

/** Owner: delete, confirmed by the exact project name in the body. */
export const DELETE = route(
  { auth: true, params: projectParamsSchema, body: deleteProjectSchema },
  ({ user, params, body }) => deleteProject(user.id, params.projectId, body.name)
);
