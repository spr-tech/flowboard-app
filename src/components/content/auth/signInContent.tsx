import { AuthShell } from "@/components/layouts/authShell/authShell";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { isGoogleSignInEnabled } from "@/server/auth/googleSignIn";
import { AuthDivider } from "./authDivider";
import { AuthNotice } from "./authNotice";
import { SignInForm } from "./forms/signInForm";
import { GithubButton } from "./githubButton";
import { GoogleButton } from "./googleButton";
import { SignInPanel } from "./signInPanel";
import { SignInProgressProvider } from "./signInProgress";

export type SignInContentProps = {
  /** From ?callbackUrl=: where to go after signing in. */
  callbackUrl?: string;
  /** From ?error=: set by Auth.js (or our signIn callback) when a Google or GitHub sign-in fails. */
  error?: string;
  /** From ?reason=: why we sent them here. */
  reason?: string;
};

/** What to say for each sign-in error code. Anything else gets the generic message. */
export const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  // GitHub never links to an existing account by email (Google does, when Google verified it).
  OAuthAccountNotLinked:
    "This email already has a Flowboard account. Sign in the way you did before: with your email and password, or with Google.",
  // src/server/auth/oauthSignIn.service.ts
  GoogleEmailUnverified:
    "Google hasn't verified this email address yet. Verify it with Google, or use your email and a password.",
  SignOutFirst: "You're already signed in. Sign out before signing in with another account.",
};
const GENERIC_ERROR = "Signing in didn't work. Please try again.";

const REASON_MESSAGES: Record<string, string> = {
  "signed-out": "You've been signed out. Please sign in again.",
  "password-reset": "Your password has been changed. Sign in with your new password.",
};

export default function SignInContent({ callbackUrl, error, reason }: SignInContentProps) {
  const errorMessage = error ? (SIGN_IN_ERROR_MESSAGES[error] ?? GENERIC_ERROR) : null;
  const reasonMessage = reason ? REASON_MESSAGES[reason] : undefined;
  const registerHref = callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register";

  return (
    <AuthShell tone="inverse" panel={<SignInPanel />}>
      <h1 className="text-5xl leading-none font-extrabold tracking-[-0.045em]">
        Welcome <Highlight>back</Highlight>
      </h1>
      <p className="mt-3.5 mb-8 text-fg-secondary">Sign in to get back to your boards.</p>

      {errorMessage && <AuthNotice tone="error">{errorMessage}</AuthNotice>}
      {!errorMessage && reasonMessage && <AuthNotice tone="info">{reasonMessage}</AuthNotice>}

      <SignInProgressProvider>
        {isGoogleSignInEnabled() && (
          <div className="mb-3">
            <GoogleButton callbackUrl={callbackUrl} />
          </div>
        )}
        <GithubButton callbackUrl={callbackUrl} />
        <AuthDivider label="or use your email" />
        <SignInForm callbackUrl={callbackUrl} />
      </SignInProgressProvider>

      <p className="mt-6 text-center text-[15px] text-fg-secondary">
        New to Flowboard? <TextLink href={registerHref}>Create an account</TextLink>
      </p>
    </AuthShell>
  );
}
