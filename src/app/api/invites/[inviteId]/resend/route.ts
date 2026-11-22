import { inviteParamsSchema } from "@/models/validations/memberValidation";
import { resendInvite } from "@/server/invites/invites.service";
import { route } from "@/server/lib/route";

/** A new link and 7 more days for a pending invite, and the email again (owner only). */
export const POST = route({ auth: true, params: inviteParamsSchema }, ({ user, params }) =>
  resendInvite(user.id, params.inviteId)
);
