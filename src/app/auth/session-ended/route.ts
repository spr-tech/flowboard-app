import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";

/**
 * Where the app layout sends a session that middleware accepted but the server rejected
 * (signed in before the password changed, or the user is gone).
 *
 * Middleware only checks the token's signature, so it still sees such a visitor as signed in
 * and would bounce /login straight back to /dashboard, forever. Server components can't delete
 * cookies; a route handler can, so this clears the session and then shows /login.
 */
export async function GET() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  await signOut({ redirectTo: "/login?reason=signed-out" });
}
