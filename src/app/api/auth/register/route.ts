import { registerRequestSchema } from "@/models/validations/authValidation";
import { signUp } from "@/server/auth/signUp.service";
import { route } from "@/server/lib/route";

/**
 * Create an email + password account and send the confirm-your-email code. 201 with the user and
 * whether to go to /verify-email next; 409 if the email is taken.
 */
export const POST = route(
  { auth: false, body: registerRequestSchema, status: 201 },
  ({ body: { name, email, password, inviteToken } }) => signUp({ name, email, password, inviteToken })
);
