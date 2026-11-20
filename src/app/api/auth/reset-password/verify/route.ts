import { NextResponse } from "next/server";

import type { VerifyResetTokenResponse } from "@/models/responses/authResponses";
import { verifyResetTokenSchema } from "@/models/validations/authValidation";
import { getResetTokenState } from "@/server/auth/passwordReset.service";
import { errorResponse, readJson } from "@/server/lib/errors";

/** Is this reset link still usable? Checking doesn't use it up. POST so the token stays out of URLs and logs. */
export async function POST(request: Request) {
  try {
    const { token } = verifyResetTokenSchema.parse(await readJson(request));
    const body: VerifyResetTokenResponse = { state: await getResetTokenState(token) };
    return NextResponse.json(body);
  } catch (error) {
    return errorResponse(error);
  }
}
