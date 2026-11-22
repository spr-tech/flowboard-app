// Sign-in rate limit: at most 5 failed email-and-password attempts per email in 15 minutes,
// counted in the SignInAttempt table. Real and unknown emails are treated exactly alike, so the
// answer never reveals whether an account exists. GitHub sign-in isn't affected.
import { CredentialsSignin } from "next-auth";

import { verifyCredentials, type SignedInUser } from "@/server/auth/auth.service";
import { prisma } from "@/server/lib/prisma";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

export const SIGN_IN_ATTEMPT_LIMIT = 5;
export const SIGN_IN_WINDOW_MS = 15 * 60 * 1000;

/** Auth.js passes `code` to the sign-in form, which shows "Too many attempts…" for it. */
export class TooManySignInAttempts extends CredentialsSignin {
  code = "rate_limited";
}

const windowStart = () => new Date(Date.now() - SIGN_IN_WINDOW_MS);

export async function isSignInBlocked(email: string): Promise<boolean> {
  const failures = await prisma.signInAttempt.count({ where: { email, createdAt: { gte: windowStart() } } });
  return failures >= SIGN_IN_ATTEMPT_LIMIT;
}

/** Records a failure, and tidies away this email's rows that have left the window. */
async function recordFailure(email: string) {
  await prisma.$transaction([
    prisma.signInAttempt.deleteMany({ where: { email, createdAt: { lt: windowStart() } } }),
    prisma.signInAttempt.create({ data: { email } }),
  ]);
}

/**
 * The credentials check behind the sign-in form. Blocked emails are refused before the password is
 * even compared (attempts while blocked don't extend the block); a wrong password counts as a
 * failure; a right one clears this email's failures.
 */
export async function signInWithPassword(emailInput: string, password: string): Promise<SignedInUser | null> {
  const email = normaliseEmail(emailInput);
  if (await isSignInBlocked(email)) throw new TooManySignInAttempts();

  const user = await verifyCredentials(email, password);
  if (!user) {
    await recordFailure(email);
    return null;
  }
  await prisma.signInAttempt.deleteMany({ where: { email } });
  return user;
}
