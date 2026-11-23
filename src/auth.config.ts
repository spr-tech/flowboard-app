// The Edge-safe half of the Auth.js setup, used by middleware. No Prisma, no bcrypt, no Node APIs:
// middleware only checks that a valid session token exists. The database checks (including
// "signed in before the password changed") live in src/auth.ts and run on the Node side.
import type { NextAuthConfig } from "next-auth";

import { DEFAULT_SIGNED_IN_PATH } from "@/utilities/helpers/safeCallbackUrl";

/** Signed-out visitors are sent to /login from these, and from everything under them. */
const PROTECTED_PATHS = ["/dashboard", "/projects", "/settings"];

/**
 * Signed-out visitors are sent to /login from this exact path only. /verify-email/link/... stays
 * open: the emailed link works on any device, signed in or not.
 */
const VERIFY_EMAIL_PATH = "/verify-email";

/** Signed-in users are sent to the dashboard from these. (/reset-password stays open to everyone.) */
const SIGNED_OUT_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

function isUnder(pathname: string, paths: string[]): boolean {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export const authConfig = {
  pages: {
    signIn: "/login",
    // Sign-in errors (like a GitHub email that already has a password account) land on /login?error=...
    error: "/login",
  },
  // Credentials sign-in only works with JWT sessions; the Prisma adapter would default to database ones.
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isSignedIn = Boolean(auth?.user);

      if (isUnder(nextUrl.pathname, SIGNED_OUT_ONLY_PATHS)) {
        return isSignedIn ? Response.redirect(new URL(DEFAULT_SIGNED_IN_PATH, nextUrl)) : true;
      }
      // false sends the visitor to pages.signIn with ?callbackUrl= set to where they were going.
      if (isUnder(nextUrl.pathname, PROTECTED_PATHS) || nextUrl.pathname === VERIFY_EMAIL_PATH) return isSignedIn;

      return true;
    },
  },
} satisfies NextAuthConfig;
