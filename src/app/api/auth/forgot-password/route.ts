import { after, NextResponse } from "next/server";

import type { ForgotPasswordResponse } from "@/models/responses/authResponses";
import { forgotPasswordSchema } from "@/models/validations/authValidation";
import { requestPasswordReset } from "@/server/auth/passwordReset.service";
import { appUrl } from "@/server/lib/appUrl";
import { errorResponse, readJson } from "@/server/lib/errors";

const SAME_ANSWER: ForgotPasswordResponse = {
  message: "If an account exists for that email, we've sent a link to reset the password.",
};

/**
 * Always answers the same, at the same speed, whether or not the email has an account.
 * The lookup and the email run after the response is sent (Next's `after`), so neither the
 * answer nor its timing reveals anything. Rate limiting happens inside the service.
 */
export async function POST(request: Request) {
  try {
    const { email } = forgotPasswordSchema.parse(await readJson(request));
    const baseUrl = appUrl();

    // Runs after the response, so nobody sees a failure here: log every outcome, or it's silent.
    // The outcome goes only to server logs, never to the client.
    after(async () => {
      try {
        const outcome = await requestPasswordReset(email, baseUrl);
        console.info(`[forgot-password] finished: ${outcome}`);
      } catch (error) {
        console.error("[forgot-password] FAILED:", error);
      }
    });

    return NextResponse.json(SAME_ANSWER);
  } catch (error) {
    return errorResponse(error);
  }
}
