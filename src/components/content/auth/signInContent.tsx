import { AuthShell } from "@/components/layouts/authShell/authShell";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { AuthDivider } from "./authDivider";
import { AuthNotice } from "./authNotice";
import { SignInForm } from "./forms/signInForm";
import { GithubButton } from "./githubButton";
import { SignInPanel } from "./signInPanel";

export type SignInContentProps = {
  /** From ?callbackUrl=: where to go after signing in. */
  callbackUrl?: string;
  /** From ?error=: set by Auth.js when a GitHub sign-in fails. */
  error?: string;
  /** From ?reason=: why we sent them here. */
  reason?: string;
};

/** What to say for each Auth.js error code. Anything else gets the generic GitHub message. */
const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked: "This email already has a Flowboard account. Sign in with your email and password.",
};
const GENERIC_ERROR = "Signing in with GitHub didn't work. Please try again.";

const REASON_MESSAGES: Record<string, string> = {
  "signed-out": "You've been signed out. Please sign in again.",
  "password-reset": "Your password has been changed. Sign in with your new password.",
};

export default function SignInContent({ callbackUrl, error, reason }: SignInContentProps) {
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? GENERIC_ERROR) : null;
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

      <GithubButton callbackUrl={callbackUrl} />
      <AuthDivider label="or use your email" />
      <SignInForm callbackUrl={callbackUrl} />

      <p className="mt-6 text-center text-[15px] text-fg-secondary">
        New to Flowboard? <TextLink href={registerHref}>Create an account</TextLink>
      </p>
    </AuthShell>
  );
}
