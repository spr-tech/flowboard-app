import { signIn } from "@/auth";
import { changePasswordSchema } from "@/models/validations/authValidation";
import { changePassword } from "@/server/account/account.service";
import { route } from "@/server/lib/route";

/**
 * Change my password (email accounts). Saving it sets passwordChangedAt, which ends every session
 * that signed in before now, this one included; so this device is signed in again straight away
 * with the new password (a fresh session cookie on this response). Other devices stay signed out.
 */
export const PATCH = route({ auth: true, body: changePasswordSchema }, async ({ user, body }) => {
  const me = await changePassword(user.id, body);
  await signIn("credentials", { email: me.email, password: body.password, redirect: false });
  return me;
});
