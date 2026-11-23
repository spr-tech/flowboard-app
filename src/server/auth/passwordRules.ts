// The new-password rules the browser can't check for itself: the common-password list (kept off the
// browser) and the name/email rule against the real account (the reset form doesn't know whose
// account it is). Used when a password is set: sign-up, reset and change. The length rules live in
// the shared schema (authValidation.ts).
import { PERSONAL_INFO_MESSAGE, passwordMentionsYou } from "@/models/validations/authValidation";
import { ApiError } from "@/server/lib/errors";
import { COMMON_PASSWORDS } from "./commonPasswords";

export const COMMON_PASSWORD_MESSAGE = "This password is too common. Try a longer or less predictable one.";

export const isCommonPassword = (password: string) => COMMON_PASSWORDS.has(password.toLowerCase());

/** 400 with the message on the password field (so the form shows it there), or nothing. */
export function assertPasswordAllowed(
  password: string,
  who: { email?: string | null; name?: string | null },
  field = "password"
) {
  const message = isCommonPassword(password)
    ? COMMON_PASSWORD_MESSAGE
    : passwordMentionsYou(password, who)
      ? PERSONAL_INFO_MESSAGE
      : null;
  if (message) throw new ApiError(400, "VALIDATION_FAILED", "Some fields need fixing.", { [field]: message });
}
