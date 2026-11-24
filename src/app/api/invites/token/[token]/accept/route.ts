import { inviteTokenParamsSchema } from "@/models/validations/memberValidation";
import { acceptInvite } from "@/server/invites/invites.service";
import { route } from "@/server/lib/route";

/** Join the project the link is for; only the invited email may. */
export const POST = route({ auth: "allowUnverified", params: inviteTokenParamsSchema }, ({ user, params }) =>
  acceptInvite(user.id, params.token)
);
