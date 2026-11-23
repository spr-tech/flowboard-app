import { redirect } from "next/navigation";

import { auth, signOut } from "@/auth";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";

/**
 * Where a session that middleware accepted but the server rejected ends up (signed in before the
 * password changed, or the user is gone). Two ways in: the app layout, and the base query when
 * an API call answers 401 (it adds ?callbackUrl= with the page the user was on).
 *
 * Middleware only checks the token's signature, so it still sees such a visitor as signed in
 * and would bounce /login straight back to /dashboard, forever. Server components can't delete
 * cookies; a route handler can, so this clears the session and then shows /login.
 */
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const requested = searchParams.get("callbackUrl");
  // Only ever a path on this site, so the link can't be used to send people elsewhere.
  const destination = requested ? safeCallbackUrl(requested, origin) : null;

  const session = await auth();
  if (session?.user) redirect(destination ?? "/dashboard");

  const login = destination
    ? `/login?reason=signed-out&callbackUrl=${encodeURIComponent(destination)}`
    : "/login?reason=signed-out";
  await signOut({ redirectTo: login });
}
