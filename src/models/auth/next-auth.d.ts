// Typed additions to Auth.js: what our session and session token carry.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** The User row's id. */
      id: string;
      email: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** The User row's id. */
    id?: string;
    /** When this session signed in (milliseconds). Compared with User.passwordChangedAt. */
    authTime?: number;
  }
}
