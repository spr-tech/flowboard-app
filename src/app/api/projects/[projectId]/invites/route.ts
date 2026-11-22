import { inviteSchema } from "@/models/validations/memberValidation";
import { projectParamsSchema } from "@/models/validations/projectValidation";
import { createInvite, listInvites } from "@/server/invites/invites.service";
import { route } from "@/server/lib/route";

/** The project's pending invites (owner only). */
export const GET = route({ auth: true, params: projectParamsSchema }, ({ user, params }) =>
  listInvites(user.id, params.projectId)
);

/** Invite by email (owner only); an email with a pending invite gets it sent again. */
export const POST = route(
  { auth: true, params: projectParamsSchema, body: inviteSchema, status: 201 },
  ({ user, params, body }) => createInvite(user.id, params.projectId, body.email)
);
