import { projectParamsSchema } from "@/models/validations/projectValidation";
import { listMembers } from "@/server/members/members.service";
import { route } from "@/server/lib/route";

/** Everyone on the project with their role and task count (members only, else 404). */
export const GET = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  listMembers(user.id, params.projectId)
);
