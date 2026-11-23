// Email verification (docs/plan/01-product-and-flows.md, "Confirm your email"; 03-data-model.md).
// - Each send makes a 6-digit code (15 minutes, 5 tries) and a separate link token (24 hours).
//   Only SHA-256 hashes are stored.
// - A new send cancels older unused rows (code and link together).
// - At most 3 sends per user per rolling hour, and one a minute, counted from the rows.
// - Using the code or the link claims the row and sets User.emailVerified in one transaction, so
//   two clicks or a double submit can't both succeed.
// - The email goes out after the commit, never inside the transaction.
// - Unverified users can do everything except invite people (requireVerifiedEmail).
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

import type { MeResponse } from "@/models/responses/meResponses";
import type {
  VerificationStatusResponse,
  VerifyLinkResponse,
} from "@/models/responses/emailVerificationResponses";
import { getMe } from "@/server/account/account.service";
import { verificationEmail } from "@/server/auth/authEmails";
import { appUrl } from "@/server/lib/appUrl";
import { sendEmail } from "@/server/lib/email";
import { ApiError, unauthenticated } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { createToken, hashToken } from "@/server/lib/secureToken";
import { transaction } from "@/server/lib/transaction";
import type { Db } from "@/server/projects/projectAccess";

export const CODE_TTL_MS = 15 * 60 * 1000;
export const LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const MAX_CODE_ATTEMPTS = 5;
export const SENDS_PER_HOUR = 3;
export const RESEND_COOLDOWN_MS = 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

// ─── Codes ───────────────────────────────────────────────────────────────────

/**
 * SHA-256 of "<userId>:<code>", in hex. The user id keeps two users with the same code from sharing
 * a hash. Six digits are only a million values, so a stolen hash could be reversed by trying them
 * all: that's why a code lives 15 minutes and the link has its own long token.
 */
export function hashCode(userId: string, code: string): string {
  return createHash("sha256").update(`${userId}:${code}`).digest("hex");
}

/** A random 6-digit code, zero-padded ("004217"). randomInt is a CSPRNG and has no modulo bias. */
export function createCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/** Compares two hex hashes in constant time, so response times don't leak how much matched. */
function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export const EMAIL_NOT_VERIFIED_MESSAGE = "Confirm your email before inviting people.";

const codeExpired = () => new ApiError(400, "CODE_EXPIRED", "This code has expired. Send a new one.");
const tooManyAttempts = () => new ApiError(400, "TOO_MANY_ATTEMPTS", "Too many attempts. Send a new code.");
const codeWrong = (left: number) =>
  new ApiError(400, "CODE_WRONG", `Wrong code. ${left} ${left === 1 ? "attempt" : "attempts"} left.`);
const alreadyVerified = () => new ApiError(400, "ALREADY_VERIFIED", "Your email is already confirmed.");

const LINK_ERRORS = {
  invalid: () => new ApiError(400, "TOKEN_INVALID", "This link isn't valid. Use the button in your latest email."),
  used: () =>
    new ApiError(400, "TOKEN_USED", "This link has already been used, or a newer email replaced it."),
  expired: () => new ApiError(400, "TOKEN_EXPIRED", "This link has expired. Send a new code from Flowboard."),
};

// ─── Send limits ─────────────────────────────────────────────────────────────

type SentRow = { createdAt: Date };

/** The last hour's sends, newest first. */
async function recentSends(db: Db, userId: string, now: Date): Promise<SentRow[]> {
  return db.emailVerificationToken.findMany({
    where: { userId, createdAt: { gt: new Date(now.getTime() - HOUR_MS) } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
}

/**
 * When the next send is allowed, from the last hour's sends (newest first): a minute after the
 * newest, and, once 3 are used, an hour after the oldest of those 3. Null means "now".
 */
export function nextSendAt(sends: SentRow[], now: Date): Date | null {
  const times: number[] = [];
  if (sends[0]) times.push(sends[0].createdAt.getTime() + RESEND_COOLDOWN_MS);
  if (sends.length >= SENDS_PER_HOUR) times.push(sends[SENDS_PER_HOUR - 1].createdAt.getTime() + HOUR_MS);
  const at = Math.max(0, ...times);
  return at > now.getTime() ? new Date(at) : null;
}

function statusOf(email: string, isVerified: boolean, sends: SentRow[], now: Date): VerificationStatusResponse {
  const next = isVerified ? null : nextSendAt(sends, now);
  return {
    email,
    isVerified,
    resendAvailableAt: next ? next.toISOString() : null,
    sendsLeftThisHour: Math.max(0, SENDS_PER_HOUR - sends.length),
  };
}

/** 429 if this user can't have another code yet: the hourly limit first, then the one-minute wait. */
function assertCanSend(sends: SentRow[], now: Date) {
  if (sends.length >= SENDS_PER_HOUR) {
    const freeAt = sends[SENDS_PER_HOUR - 1].createdAt.getTime() + HOUR_MS;
    const minutes = Math.max(1, Math.ceil((freeAt - now.getTime()) / 60_000));
    throw new ApiError(
      429,
      "SEND_LIMIT",
      `You've asked for ${SENDS_PER_HOUR} codes in the last hour. Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
    );
  }
  const next = nextSendAt(sends, now);
  if (next) {
    const seconds = Math.max(1, Math.ceil((next.getTime() - now.getTime()) / 1000));
    throw new ApiError(429, "SEND_TOO_SOON", `Wait ${seconds} seconds before asking for another code.`);
  }
}

// ─── Status and sending ──────────────────────────────────────────────────────

async function findUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  // The session already reloads the user, so this only happens if they vanish mid-request.
  if (!user) throw unauthenticated();
  return user;
}

/** What /verify-email shows: the address, and when "Resend code" works again. */
export async function getVerificationStatus(userId: string): Promise<VerificationStatusResponse> {
  const now = new Date();
  const user = await findUser(userId);
  const sends = user.emailVerified ? [] : await recentSends(prisma, userId, now);
  return statusOf(user.email, Boolean(user.emailVerified), sends, now);
}

/** Sends a new code and link, cancelling older ones. Returns the status after sending. */
export async function sendVerificationCode(userId: string): Promise<VerificationStatusResponse> {
  const user = await findUser(userId);
  if (user.emailVerified) throw alreadyVerified();

  const code = createCode();
  const { token, tokenHash: linkTokenHash } = createToken();

  const sends = await transaction(async (tx) => {
    // Touching the user row locks it until the commit, so two sends at the same moment take turns:
    // the second one counts the first one's row and can't slip past the hourly limit.
    await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() }, select: { id: true } });
    const now = new Date();
    const earlier = await recentSends(tx, userId, now);
    assertCanSend(earlier, now);

    // Cancel older codes and links. Marked used rather than deleted: deleting would reset the count.
    await tx.emailVerificationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    const created = await tx.emailVerificationToken.create({
      data: {
        userId,
        codeHash: hashCode(userId, code),
        linkTokenHash,
        codeExpiresAt: new Date(now.getTime() + CODE_TTL_MS),
        linkExpiresAt: new Date(now.getTime() + LINK_TTL_MS),
      },
      select: { createdAt: true },
    });
    return [created, ...earlier];
  });

  // Committed: now the email.
  try {
    await sendEmail(verificationEmail(user, code, `${appUrl()}/verify-email/link/${encodeURIComponent(token)}`));
  } catch {
    // sendEmail has logged the details. The row stays (and counts), so the limits still hold.
    throw new ApiError(502, "EMAIL_NOT_SENT", "We couldn't send the email. Try again in a minute.");
  }
  return statusOf(user.email, false, sends, new Date());
}

// ─── Using a code or a link ──────────────────────────────────────────────────

/** Sets emailVerified if it's empty. True if this call set it. */
export async function markEmailVerified(userId: string, db: Db = prisma): Promise<boolean> {
  const { count } = await db.user.updateMany({
    where: { id: userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });
  return count === 1;
}

/** Checks the code typed on /verify-email. Returns the signed-in user, now verified. */
export async function verifyCode(userId: string, code: string): Promise<MeResponse> {
  const user = await findUser(userId);
  // Already confirmed (by the link in another tab, say): nothing to check.
  if (user.emailVerified) return getMe(userId);

  const row = await prisma.emailVerificationToken.findFirst({
    where: { userId, usedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, codeHash: true, codeExpiresAt: true, attempts: true },
  });
  if (!row || row.codeExpiresAt.getTime() <= Date.now()) throw codeExpired();
  if (row.attempts >= MAX_CODE_ATTEMPTS) throw tooManyAttempts();

  if (!sameHash(hashCode(userId, code), row.codeHash)) {
    // Conditional, so wrong guesses sent at the same moment can't go past the limit.
    const { count } = await prisma.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (count === 0) throw tooManyAttempts();
    const after = await prisma.emailVerificationToken.findUnique({ where: { id: row.id }, select: { attempts: true } });
    const left = MAX_CODE_ATTEMPTS - (after?.attempts ?? MAX_CODE_ATTEMPTS);
    if (left <= 0) throw tooManyAttempts();
    throw codeWrong(left);
  }

  await transaction(async (tx) => {
    // Claim the row: only one request can turn usedAt from null to now.
    const now = new Date();
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null, codeExpiresAt: { gt: now }, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw codeExpired();
    await markEmailVerified(userId, tx);
  });
  return getMe(userId);
}

/** The backup link from the email. Public: the token is the secret. Only a POST (a click) uses it. */
export async function verifyLink(token: string): Promise<VerifyLinkResponse> {
  const row = await prisma.emailVerificationToken.findUnique({
    where: { linkTokenHash: hashToken(token) },
    select: { id: true, userId: true, usedAt: true, linkExpiresAt: true, user: { select: { email: true } } },
  });
  if (!row) throw LINK_ERRORS.invalid();
  if (row.usedAt) throw LINK_ERRORS.used();
  if (row.linkExpiresAt.getTime() <= Date.now()) throw LINK_ERRORS.expired();

  await transaction(async (tx) => {
    const now = new Date();
    const claimed = await tx.emailVerificationToken.updateMany({
      where: { id: row.id, usedAt: null, linkExpiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) throw LINK_ERRORS.used();
    await markEmailVerified(row.userId, tx);
  });
  return { email: row.user.email };
}

// ─── Elsewhere in the app ────────────────────────────────────────────────────

/** 403 unless the user's email is confirmed. Inviting needs it, so our Gmail can't be used to spam. */
export async function requireVerifiedEmail(db: Db, userId: string): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user?.emailVerified) throw new ApiError(403, "EMAIL_NOT_VERIFIED", EMAIL_NOT_VERIFIED_MESSAGE);
}

/**
 * Accepting an invite proves the user received email at this address (the invite's email must
 * match theirs): confirm it, and retire any code still waiting. Runs inside acceptInvite's transaction.
 */
export async function verifyThroughInvite(db: Db, userId: string): Promise<void> {
  if (await markEmailVerified(userId, db)) {
    await db.emailVerificationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  }
}

/**
 * Auth.js's signIn event (src/auth.ts). GitHub only gives us verified primary emails, so a GitHub
 * sign-in counts as confirmed. Email-and-password sign-ins change nothing.
 */
export async function onSignIn({ user, account }: { user: { id?: string }; account?: { provider: string } | null }) {
  if (account?.provider === "github" && user.id) await markEmailVerified(user.id);
}
