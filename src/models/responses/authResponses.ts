/** POST /api/auth/register (201). */
export type RegisterResponse = {
  id: string;
  name: string | null;
  email: string;
};

/** POST /api/auth/forgot-password: always this, whether or not the email has an account. */
export type ForgotPasswordResponse = {
  message: string;
};

/**
 * POST /api/auth/reset-password/verify. Checking does not use the link up.
 * "invalid" means no such link: mistyped, or cut short by an email client.
 */
export type ResetTokenState = "valid" | "expired" | "used" | "invalid";

export type VerifyResetTokenResponse = {
  state: ResetTokenState;
};

/** POST /api/auth/reset-password (200): the account whose password changed. */
export type ResetPasswordResponse = {
  email: string;
};
