import { inviteParamsSchema } from "@/models/validations/memberValidation";
import { cancelInvite } from "@/server/invites/invites.service";
import { route } from "@/server/lib/route";

/** Cancel a pending invite (owner only). */
export const DELETE = route({ auth: true, params: inviteParamsSchema }, ({ user, params }) =>
  cancelInvite(user.id, params.inviteId)
);
