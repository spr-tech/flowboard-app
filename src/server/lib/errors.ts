// Turns anything a route handler throws into our error shape: { error: { code, message, fields? } }.
// src/server/lib/route.ts wraps every handler with this (and adds the session check).
import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiErrorBody } from "@/models/responses/apiError";

/** Throw this from a service to send a specific status and code to the browser. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** 401: not signed in, or the session ended (expired, or the password changed since). */
export function unauthenticated() {
  return new ApiError(401, "UNAUTHENTICATED", "Your session has ended. Please sign in again.");
}

/** The first message for each field, keyed by its path ("email", "address.city"). */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    fields[key] ??= issue.message;
  }
  return fields;
}

export function errorResponse(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fields: error.fields } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_FAILED",
          message: "Some fields need fixing.",
          fields: zodFieldErrors(error),
        },
      },
      { status: 400 },
    );
  }

  // Anything else is our bug. Log the details here; never send them to the browser.
  console.error(error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side. Please try again." } },
    { status: 500 },
  );
}

/** The JSON body, or a 400 if it isn't JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "The request body must be JSON.");
  }
}
