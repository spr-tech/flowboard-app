// The rules every Google or GitHub sign-in passes before Auth.js links or creates an account
// (docs/plan/01-product-and-flows.md, "Google sign-in"). Called from the signIn callback in
// src/auth.ts, which runs before Auth.js touches the database: returning a URL sends the visitor
// there instead, and anything thrown stops the sign-in (Auth.js turns it into AccessDenied).
// Events like linkAccount can't do this: Auth.js runs them after the link is saved, and swallows
// their errors.
import { prisma } from "@/server/lib/prisma";
import { transaction } from "@/server/lib/transaction";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

/** The ?error= codes /login explains. */
export const OAUTH_SIGN_IN_ERRORS = {
  /** Google hasn't verified this email, so it proves nothing about who owns it. */
  googleEmailUnverified: "GoogleEmailUnverified",
  /** Someone is already signed in here (see below). */
  signOutFirst: "SignOutFirst",
} as const;

const loginWithError = (code: string) => `/login?error=${code}`;

type OAuthSignIn = {
  /** Auth.js's account for this sign-in: which provider, and the user's id there. */
  account: { provider: string; providerAccountId: string } | null | undefined;
  /** What the provider says about the user. Google's has email_verified. */
  profile: { email?: string | null; email_verified?: boolean | null } | undefined;
  /** True when this browser already has a currently valid session (not just a leftover cookie). */
  hasValidSession: () => Promise<boolean>;
};

/**
 * true to let the sign-in continue, or a /login?error= URL to send the visitor to instead.
 * 1. Google and GitHub sign-ins are refused while a valid session exists. Signed in, Auth.js would
 *    link the new account to whoever is signed in, whatever its email. Nothing in Flowboard offers
 *    that, so it's always refused; the buttons that might meet a session sign out first.
 * 2. Google must report the email as verified.
 * 3. A Google email that matches an existing user is linked to it automatically (Auth.js does
 *    the link). If that user had never confirmed their email, anyone could have created the
 *    account with this address, so its password, sessions and reset links are ended first.
 */
export async function checkOAuthSignIn({ account, profile, hasValidSession }: OAuthSignIn): Promise<true | string> {
  if (!account || (account.provider !== "google" && account.provider !== "github")) return true;

  if (await hasValidSession()) return loginWithError(OAUTH_SIGN_IN_ERRORS.signOutFirst);
  if (account.provider === "github") return true;

  if (profile?.email_verified !== true || !profile.email) {
    return loginWithError(OAUTH_SIGN_IN_ERRORS.googleEmailUnverified);
  }

  const alreadyLinked = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider: "google", providerAccountId: account.providerAccountId } },
    select: { userId: true },
  });
  if (alreadyLinked) return true;

  const existing = await prisma.user.findUnique({
    where: { email: normaliseEmail(profile.email) },
    select: { id: true, emailVerified: true },
  });
  if (existing && !existing.emailVerified) await takeOverUnverifiedAccount(existing.id);
  return true;
}

/**
 * The pre-hijack fix. Someone may have signed up with this address and a password of their own
 * without ever confirming it. Google has now proved who owns the address, so in one transaction:
 * the password goes, passwordChangedAt ends every session that signed in before now (the check in
 * sessionToken.ts), unused reset links and codes are cancelled, and the email counts as confirmed.
 * If this throws, the sign-in stops and Google is never linked. The new Google session is stamped
 * after this, so it survives. Setting a password again is a follow-up (06-build-order.md).
 */
async function takeOverUnverifiedAccount(userId: string): Promise<void> {
  const now = new Date();
  await transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash: null, passwordChangedAt: now, emailVerified: now },
    });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
    await tx.emailVerificationToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
  });
}
