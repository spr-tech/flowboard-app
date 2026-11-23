import { resetPasswordSchema } from "@/models/validations/authValidation";
import { resetPassword } from "@/server/auth/passwordReset.service";
import { route } from "@/server/lib/route";

/** Set a new password with a reset link. 400 TOKEN_INVALID / TOKEN_USED / TOKEN_EXPIRED otherwise. */
export const POST = route({ auth: false, body: resetPasswordSchema }, ({ body: { token, password } }) =>
  resetPassword(token, password)
);
