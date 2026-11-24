/**
 * Google sign-in is on only where AUTH_GOOGLE_ID is set (local .env and Vercel Production; not
 * Preview, whose URLs change and can't be registered with Google). src/auth.ts adds the provider
 * and the pages show "Continue with Google" only then, so no environment shows a broken button.
 */
export function isGoogleSignInEnabled(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim());
}
