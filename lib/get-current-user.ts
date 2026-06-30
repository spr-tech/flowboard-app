import { auth } from "@/auth";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;

  return session.user;
}

// ─── FUNCTION ──────────────────────────────────────────────────────────────
// getCurrentUser
//    — a reusable helper that returns the currently logged in user
//    — calls auth() which comes from auth.ts, the central Auth.js config
//    — auth() returns either a session object (if someone is logged in)
//      or null (if nobody is logged in)
//
// session?.user
//    — the ?. is optional chaining
//    — if session is null, trying session.user directly would crash the app
//    — optional chaining safely checks first: does session exist?
//      if yes, give me .user. if no, just give undefined, no crash
//
// if (!session?.user) return null
//    — if there is no session OR no user inside it, stop here and return null
//    — this means anywhere this function is called, you can simply check
//      "if (!user)" to know whether someone is logged in or not
//
// return session.user
//    — if we got past the check above, a real logged in user exists
//    — return their user object so the calling code can use it
//      (their id, name, email etc)
//
// WHY THIS FUNCTION EXISTS
//    — without it, every single Server Action would have to repeat:
//      const session = await auth()
//      if (!session?.user) return error
//    — by wrapping that logic once in this file, every Server Action
//      just calls getCurrentUser() instead of repeating the same check
//    — keeps the codebase clean and the auth check consistent everywhere
