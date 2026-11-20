import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiRequestError, NETWORK_ERROR_MESSAGE } from "@/services/authService";

/**
 * Puts a failed request's per-field messages on the matching form fields.
 * Returns the message to show above the button, or null when every problem landed on a field.
 */
export function applyApiError<TValues extends FieldValues>(
  error: unknown,
  fieldNames: readonly Path<TValues>[],
  setError: UseFormSetError<TValues>,
): string | null {
  if (!(error instanceof ApiRequestError)) return NETWORK_ERROR_MESSAGE;

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
