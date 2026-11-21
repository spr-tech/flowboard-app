import { projectParamsSchema } from "@/models/validations/projectValidation";
import { pinProject, unpinProject } from "@/server/projects/projectPins.service";
import { route } from "@/server/lib/route";

/** Pins are per user; any member can pin. Both answer with my updated membership. */
export const POST = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  pinProject(user.id, params.projectId)
);

export const DELETE = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  unpinProject(user.id, params.projectId)
);
