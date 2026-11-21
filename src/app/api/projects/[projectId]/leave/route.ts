import { projectParamsSchema } from "@/models/validations/projectValidation";
import { leaveProject } from "@/server/projects/projects.service";
import { route } from "@/server/lib/route";

/** A member (not the owner) leaves; their tasks here become unassigned. */
export const POST = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  leaveProject(user.id, params.projectId)
);
