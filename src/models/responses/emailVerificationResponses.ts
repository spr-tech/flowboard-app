/**
 * GET /api/auth/verify-email/status, and POST /api/auth/verify-email/send (after sending).
 * What the /verify-email page needs to show the resend cooldown and the hourly limit after a reload.
 */
export type VerificationStatusResponse = {
  email: string;
  isVerified: boolean;
  /** When "Resend code" works again (ISO), or null if it works now. */
  resendAvailableAt: string | null;
  /** Codes left in the rolling hour (3 at most). */
  sendsLeftThisHour: number;
};

/** POST /api/auth/verify-email/link (200): the account whose email is now confirmed. */
export type VerifyLinkResponse = {
  email: string;
};

/** POST /api/auth/verify-email/start-over: whether the unconfirmed account was deleted (kept if not empty). */
export type StartOverResponse = {
  deleted: boolean;
};
