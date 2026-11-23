import { verifyCodeSchema } from "@/models/validations/emailVerificationValidation";
import { verifyCode } from "@/server/auth/emailVerification.service";
import { route } from "@/server/lib/route";

/**
 * Check the 6-digit code. 200 with the signed-in user, now verified; 400 CODE_WRONG (with the
 * attempts left), CODE_EXPIRED or TOO_MANY_ATTEMPTS.
 */
export const POST = route({ auth: true, body: verifyCodeSchema }, ({ user, body: { code } }) =>
  verifyCode(user.id, code)
);
