/**
 * The public address of this deployment, for links in emails.
 *
 * Deliberately not taken from the request's Host header: with AUTH_TRUST_HOST=true, a forged
 * Host header could put an attacker's domain into a real password-reset email and leak the token.
 *
 * Order: APP_URL (set it in Production) → the Vercel branch URL on previews → localhost in development.
 */
export function appUrl(): string {
  const configured = process.env.APP_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const vercelBranchUrl = process.env.VERCEL_BRANCH_URL;
  if (vercelBranchUrl) return `https://${vercelBranchUrl}`;

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error("APP_URL is not set. Set it to the site's public address, e.g. https://flowboard.example.");
}
