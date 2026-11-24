// The page half of the hard verification gate (docs/plan/01-product-and-flows.md). The API half is
// in src/server/lib/route.ts. Unverified users can't reach the dashboard, projects, boards or
// settings; the (app) layout sends them to the code page, and back to where they were going after.
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";

/**
 * Where the (app) layout must send this signed-in user instead of rendering, or null to render.
 * `path` is the page they asked for (the x-flowboard-path header set by middleware).
 */
export function verificationRedirect(user: { isEmailVerified: boolean }, path: string | null): string | null {
  if (user.isEmailVerified) return null;
  // Same-origin paths only; anything odd falls back to the dashboard.
  const destination = safeCallbackUrl(path ?? undefined, "http://flowboard.internal");
  return `/verify-email?callbackUrl=${encodeURIComponent(destination)}`;
}
