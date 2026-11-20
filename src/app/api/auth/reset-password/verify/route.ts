import type { VerifyResetTokenResponse } from "@/models/responses/authResponses";
import { verifyResetTokenSchema } from "@/models/validations/authValidation";
import { getResetTokenState } from "@/server/auth/passwordReset.service";
import { route } from "@/server/lib/route";

/** Is this reset link still usable? Checking doesn't use it up. POST so the token stays out of URLs and logs. */
export const POST = route(
  { auth: false, body: verifyResetTokenSchema },
  async ({ body: { token } }): Promise<VerifyResetTokenResponse> => ({ state: await getResetTokenState(token) }),
);
