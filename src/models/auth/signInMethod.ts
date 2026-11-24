/** How a session signed in. Shown in Settings → Session ("Signed in with Google"). */
export type SignInMethod = "password" | "github" | "google";

/** Auth.js's provider id for a sign-in, as one of ours. Unknown providers count as none. */
export function toSignInMethod(provider: string | undefined): SignInMethod | undefined {
  if (provider === "credentials") return "password";
  if (provider === "github" || provider === "google") return provider;
  return undefined;
}
