import { memberParamsSchema, updateManagerPermissionsSchema } from "@/models/validations/memberValidation";
import { setManagerPermissions } from "@/server/members/members.service";
import { route } from "@/server/lib/route";

/** Owner only: turn a manager's switches on or off (send only the ones that changed). */
export const PATCH = route(
  { auth: true, params: memberParamsSchema, body: updateManagerPermissionsSchema },
  ({ user, params, body }) => setManagerPermissions(user.id, params.projectId, params.userId, body)
);
