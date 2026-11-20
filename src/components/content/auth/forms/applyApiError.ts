import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import type { AppError } from "@/models/responses/apiError";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";

/** What `.unwrap()` throws for a failed RTK Query call: the base query's AppError. */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    "message" in error &&
    typeof error.message === "string"
  );
}

/**
 * Puts a failed request's per-field messages on the matching form fields.
 * Returns the message to show above the button, or null when every problem landed on a field.
 */
export function applyApiError<TValues extends FieldValues>(
  error: unknown,
  fieldNames: readonly Path<TValues>[],
  setError: UseFormSetError<TValues>,
): string | null {
  if (!isAppError(error)) return NETWORK_ERROR_MESSAGE;

  let isOnAField = false;
  for (const name of fieldNames) {
    const message = error.fields?.[name];
    if (message) {
      setError(name, { message }, { shouldFocus: !isOnAField });
      isOnAField = true;
    }
  }
  return isOnAField ? null : error.message;
}
