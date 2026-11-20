import { NextResponse } from "next/server";

import { resetPasswordSchema } from "@/models/validations/authValidation";
import { resetPassword } from "@/server/auth/passwordReset.service";
import { errorResponse, readJson } from "@/server/lib/errors";

/** Set a new password with a reset link. 400 TOKEN_INVALID / TOKEN_USED / TOKEN_EXPIRED otherwise. */
export async function POST(request: Request) {
  try {
    const { token, password } = resetPasswordSchema.parse(await readJson(request));
    return NextResponse.json(await resetPassword(token, password));
  } catch (error) {
    return errorResponse(error);
  }
}
