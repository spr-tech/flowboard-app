import { memberParamsSchema, updateMemberRoleSchema } from "@/models/validations/memberValidation";
import { removeMember, setMemberRole } from "@/server/members/members.service";
import { route } from "@/server/lib/route";

/** Promote to manager or demote to member (owner only; at most 3 managers). */
export const PATCH = route(
  { auth: true, params: memberParamsSchema, body: updateMemberRoleSchema },
  ({ user, params, body }) => setMemberRole(user.id, params.projectId, params.userId, body.role)
);

/**
 * Remove someone (the owner: anyone but themselves; a manager with removeMembers: members only).
 * Their tasks here become unassigned.
 */
export const DELETE = route({ auth: true, params: memberParamsSchema }, ({ user, params }) =>
  removeMember(user.id, params.projectId, params.userId)
);
