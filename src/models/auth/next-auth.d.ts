// Typed additions to Auth.js: what our session and session token carry.
import type { DefaultSession } from "next-auth";

import type { SignInMethod } from "./signInMethod";

declare module "next-auth" {
  interface Session {
    user: {
      /** The User row's id. */
      id: string;
      email: string;
      /** Reloaded from the database on every server-side auth(). The verification gate reads it. */
      isEmailVerified: boolean;
      /** How this session signed in. Missing on sessions from before it was recorded. */
      signInMethod?: SignInMethod;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** The User row's id. */
    id?: string;
    /** When this session signed in (milliseconds). Compared with User.passwordChangedAt. */
    authTime?: number;
    /** How this session signed in. */
    signInMethod?: SignInMethod;
    /** Whether the user's email is confirmed, as of the last reload. */
    emailVerified?: boolean;
  }
}
