// The Node half of the Auth.js setup: the Prisma adapter, the providers and the session callbacks.
// Middleware uses the Edge-safe src/auth.config.ts instead, because it can't load Prisma.
import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Adapter } from "next-auth/adapters";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { loginSchema } from "@/models/validations/authValidation";
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
    // Reads AUTH_GITHUB_ID and AUTH_GITHUB_SECRET. If the GitHub email already belongs to a
    // password account, Auth.js refuses to link them (OAuthAccountNotLinked) and /login explains why.
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
  callbacks: {
    ...authConfig.callbacks,
    // `user` is only set at sign-in. The passwordChangedAt check happens in updateSessionToken.
    jwt: ({ token, user }) => updateSessionToken(token, user?.id),
    session: ({ session, token }) => {
      if (token.id) session.user.id = token.id;
      return session;
    },
  },
});
