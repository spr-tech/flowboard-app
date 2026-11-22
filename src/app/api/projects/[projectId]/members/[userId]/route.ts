import { memberParamsSchema } from "@/models/validations/memberValidation";
import { removeMember } from "@/server/members/members.service";
import { route } from "@/server/lib/route";

/** Remove a member (owner only, never the owner); their tasks here become unassigned. */
export const DELETE = route({ auth: true, params: memberParamsSchema }, ({ user, params }) =>
  removeMember(user.id, params.projectId, params.userId)
);
