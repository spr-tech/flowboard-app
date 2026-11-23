import { verifyLinkSchema } from "@/models/validations/emailVerificationValidation";
import { verifyLink } from "@/server/auth/emailVerification.service";
import { route } from "@/server/lib/route";

/**
 * Use the email's backup link. Public (the token is the secret), and only a POST from the page's
 * button uses it, so email scanners that open links can't. 400 TOKEN_EXPIRED, TOKEN_USED or TOKEN_INVALID.
 */
export const POST = route({ auth: false, body: verifyLinkSchema }, ({ body: { token } }) => verifyLink(token));
