// Forgot / reset password. The rules (docs/plan/01-product-and-flows.md, 03-data-model.md):
// - never reveal whether an email has an account (the route always answers the same)
// - links expire after 1 hour and work once; asking again cancels older links
// - at most 3 emails per address per hour, counted from PasswordResetToken rows
// - GitHub-only accounts get a "sign in with GitHub" email instead of a link
// - a reset signs out every device, through User.passwordChangedAt
import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import type { ResetPasswordResponse, ResetTokenState } from "@/models/responses/authResponses";
import { githubSignInEmail, resetPasswordEmail } from "@/server/auth/authEmails";
import { BCRYPT_ROUNDS } from "@/server/auth/auth.service";
import { assertPasswordAllowed } from "@/server/auth/passwordRules";
import { sendEmail } from "@/server/lib/email";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const RESET_EMAILS_PER_HOUR = 3;
const HOUR_MS = 60 * 60 * 1000;

/** SHA-256 in hex. Only this is stored; the token itself exists only in the emailed link. */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes (256 bits) as URL-safe text, plus the hash to store. */
export function createResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashResetToken(token) };
}

/** What happened, for tests and logs. The browser always gets the same answer whatever this is. */
export type ResetRequestOutcome = "sent" | "github-only" | "unknown-email" | "rate-limited";

export async function requestPasswordReset(emailInput: string, baseUrl: string): Promise<ResetRequestOutcome> {
  const email = normaliseEmail(emailInput);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, passwordHash: true },
  });
  if (!user) return "unknown-email";

  const sentInLastHour = await prisma.passwordResetToken.count({
    where: { userId: user.id, createdAt: { gte: new Date(Date.now() - HOUR_MS) } },
  });
  if (sentInLastHour >= RESET_EMAILS_PER_HOUR) return "rate-limited";

  const now = new Date();

  if (!user.passwordHash) {
    // No password to reset. Still write a row, born used, with a hash of a token nobody holds:
    // it can never be redeemed, but it counts toward the 3-per-hour limit, so this address
    // can't be flooded with "sign in with GitHub" emails.
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: createResetToken().tokenHash, expiresAt: now, usedAt: now },
    });
    await sendEmail(githubSignInEmail(user, `${baseUrl}/login`));
    return "github-only";
  }

  const { token, tokenHash } = createResetToken();
  await prisma.$transaction([
    // Cancel older links. Marked used rather than deleted: deleting would reset the rate-limit count.
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: now } }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS) },
    }),
  ]);
  await sendEmail(resetPasswordEmail(user, `${baseUrl}/reset-password/${encodeURIComponent(token)}`));
  return "sent";
}

async function findToken(token: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashResetToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
}

function stateOf(row: { expiresAt: Date; usedAt: Date | null } | null): ResetTokenState {
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "valid";
}

/** Checks a link without using it up, so the page can show "expired" before anyone types. */
export async function getResetTokenState(token: string): Promise<ResetTokenState> {
  return stateOf(await findToken(token));
}

const TOKEN_ERRORS: Record<Exclude<ResetTokenState, "valid">, () => ApiError> = {
  invalid: () => new ApiError(400, "TOKEN_INVALID", "This reset link isn't valid. Ask for a new one."),
  used: () => new ApiError(400, "TOKEN_USED", "This reset link has already been used. Ask for a new one."),
  expired: () => new ApiError(400, "TOKEN_EXPIRED", "This reset link has expired. Ask for a new one."),
};

export async function resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
  const row = await findToken(token);
  const state = stateOf(row);
  if (!row || state !== "valid") throw TOKEN_ERRORS[state === "valid" ? "invalid" : state]();

  // The rules the form can't check: a common password, or one containing this account's name or email.
  const owner = await prisma.user.findUnique({ where: { id: row.userId }, select: { email: true, name: true } });
  assertPasswordAllowed(newPassword, owner ?? {});

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    // Claim the token: only one request can turn usedAt from null to now, so two clicks
    // at the same moment can't both reset the password.
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: row.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw TOKEN_ERRORS.used();

    // passwordChangedAt signs out every session that started before now (see isSessionStale).
    const user = await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash, passwordChangedAt: now },
      select: { email: true },
    });
    // Any other link still waiting in the inbox stops working too.
    await tx.passwordResetToken.updateMany({ where: { userId: row.userId, usedAt: null }, data: { usedAt: now } });

    return { email: user.email };
  });
}
