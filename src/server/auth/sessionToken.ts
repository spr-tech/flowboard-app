// What happens to the session token on every Node-side auth() call: the (app) layout, route
// handlers and /api/auth/session. Middleware never runs this (it only checks the token's signature).
import type { JWT } from "next-auth/jwt";

import { getSessionUser, isSessionStale } from "@/server/auth/auth.service";

/**
 * Called by the jwt callback in src/auth.ts.
 * - At sign-in (`signedInUserId` set): remember who signed in and when.
 * - On later requests: reload the user. Returning null ends the session, which Auth.js treats
 *   as signed out. That happens if the user is gone, or the password changed after this
 *   session signed in, which is how a password reset signs out every other device.
 */
export async function updateSessionToken(token: JWT, signedInUserId?: string): Promise<JWT | null> {
  if (signedInUserId) {
    // Our own timestamp, not the JWT's `iat`: Auth.js re-issues the cookie as the session is used,
    // which refreshes `iat`, so an old device's token would look brand new.
    return { ...token, id: signedInUserId, authTime: Date.now() };
  }

  if (!token.id) return null;

  const user = await getSessionUser(token.id);
  if (!user || isSessionStale(token.authTime, user.passwordChangedAt)) return null;

  // Keep name, email and picture fresh, so a renamed user doesn't need to sign out and back in.
  return { ...token, name: user.name, email: user.email, picture: user.image };
}
