import { inviteTokenParamsSchema } from "@/models/validations/memberValidation";
import { previewInvite } from "@/server/invites/invites.service";
import { route } from "@/server/lib/route";

/** What an invite link shows: its state, and for a live one the project and who sent it. Public. */
export const GET = route({ auth: false, params: inviteTokenParamsSchema }, ({ params }) => previewInvite(params.token));
