// Email verification (docs/plan/04-api.md, "Email verification"). Shared by the /verify-email
// form, the link page and the API routes, so both check the same things.
import { z } from "zod";

export const VERIFICATION_CODE_LENGTH = 6;

/** POST /api/auth/verify-email/code, and the six-box form. Exactly six digits. */
export const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, `Enter the ${VERIFICATION_CODE_LENGTH}-digit code`),
});
export type VerifyCodeValues = z.infer<typeof verifyCodeSchema>;

/** POST /api/auth/verify-email/link. 32 random bytes in base64url are 43 characters. */
export const verifyLinkSchema = z.object({
  token: z.string().trim().min(1, "The link is missing its code").max(200),
});
export type VerifyLinkValues = z.infer<typeof verifyLinkSchema>;
