export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

/**
 * Turns a `callbackUrl` from the address bar into a path on this site, or the dashboard.
 *
 * Only same-site destinations are allowed. Otherwise a link like
 * /login?callbackUrl=https://evil.example would send people to another site right after
 * they sign in (an "open redirect"). Auth.js passes full URLs (http://host/projects), so a
 * full URL on our own origin is accepted and shortened to its path.
 */
export function safeCallbackUrl(value: string | null | undefined, origin: string): string {
  if (!value) return DEFAULT_SIGNED_IN_PATH;

  // "//evil.example" and "/\evil.example" are read by browsers as another host.
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;

  try {
    const url = new URL(value);
    if (url.origin === origin) return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    // Not a URL at all.
  }
  return DEFAULT_SIGNED_IN_PATH;
}
