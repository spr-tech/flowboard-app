/**
 * Error codes that both the server and the browser act on. The server answers 403 with this when
 * a signed-in user hasn't confirmed their email (the gate in src/server/lib/route.ts); the browser's
 * base query then sends them to the code page instead of showing a toast.
 */
export const EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED";
