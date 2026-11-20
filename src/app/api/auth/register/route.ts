import { NextResponse } from "next/server";

import { registerSchema } from "@/models/validations/authValidation";
import { register } from "@/server/auth/auth.service";
import { errorResponse, readJson } from "@/server/lib/errors";

/** Create an email + password account. 201 with the user; 409 if the email is taken. */
export async function POST(request: Request) {
  try {
    const { name, email, password } = registerSchema.parse(await readJson(request));
    const user = await register({ name, email, password });
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
