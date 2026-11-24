// The Node half of the Auth.js setup: the Prisma adapter, the providers and the session callbacks.
// Middleware uses the Edge-safe src/auth.config.ts instead, because it can't load Prisma.
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { loginSchema } from "@/models/validations/authValidation";
import { onSignIn } from "@/server/auth/emailVerification.service";
import { isGoogleSignInEnabled } from "@/server/auth/googleSignIn";
import { checkOAuthSignIn } from "@/server/auth/oauthSignIn.service";
import { signInWithPassword } from "@/server/auth/signInLimit.service";
import { updateSessionToken } from "@/server/auth/sessionToken";
import { prisma } from "@/server/lib/prisma";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";
import { authConfig } from "./auth.config";

/**
 * The Prisma adapter with emails lowercased. Without this, a GitHub email like "Ada@x.com"
 * wouldn't match the existing "ada@x.com" row, and Auth.js would create a duplicate user.
 */
function createAdapter(): Adapter {
  const adapter = PrismaAdapter(prisma);
  return {
    ...adapter,
    createUser: (user) => adapter.createUser!({ ...user, email: normaliseEmail(user.email) }),
    getUserByEmail: (email) => adapter.getUserByEmail!(normaliseEmail(email)),
  };
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  adapter: createAdapter(),
  providers: [
    // Reads AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, with Google's default scopes (openid, email,
    // profile). Left out where they aren't set (previews), so there's no half-working provider.
    // Linking by email is safe only because checkOAuthSignIn refuses unverified Google emails
    // first, and strips any password from an unconfirmed account it links to.
    ...(isGoogleSignInEnabled() ? [Google({ allowDangerousEmailAccountLinking: true })] : []),
    // Reads AUTH_GITHUB_ID and AUTH_GITHUB_SECRET. If the GitHub email already belongs to another
    // account, Auth.js refuses to link them (OAuthAccountNotLinked) and /login explains why.
    GitHub,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        // null tells Auth.js the sign-in failed ("Invalid email or password"). After 5 failures in
        // 15 minutes it throws TooManySignInAttempts instead ("Too many attempts…").
        return signInWithPassword(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  events: {
    // Google and GitHub sign-ins count as a confirmed email (both only give us verified emails;
    // unverified Google emails never get this far).
    signIn: onSignIn,
  },
  callbacks: {
    ...authConfig.callbacks,
    // Runs before Auth.js links or creates an account; see oauthSignIn.service.ts.
    signIn: ({ account, profile }) =>
      checkOAuthSignIn({
        account,
        profile,
        // auth() decodes and checks the cookie and reloads the user, so an expired or ended
        // session's leftover cookie counts as no session.
        hasValidSession: async () => Boolean((await auth())?.user?.id),
      }),
    // `user` and `account` are only set at sign-in. The passwordChangedAt check happens in updateSessionToken.
    jwt: ({ token, user, account }) => updateSessionToken(token, user?.id, account?.provider),
    session: ({ session, token }) => {
      if (token.id) session.user.id = token.id;
      session.user.isEmailVerified = token.emailVerified === true;
      session.user.signInMethod = token.signInMethod;
      return session;
    },
  },
});
