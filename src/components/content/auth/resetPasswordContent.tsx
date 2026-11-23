"use client";

import { useState, type ReactNode } from "react";

import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import type { ResetTokenState } from "@/models/responses/authResponses";
import { useResetTokenState } from "@/services/authService";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { ResetPasswordForm } from "./forms/resetPasswordForm";
import { SignInPanel } from "./signInPanel";

/** "checking" until the link is verified; "unreachable" if verifying failed; "done" after saving. */
type ScreenState = "checking" | "unreachable" | ResetTokenState | "done";

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

/** The dead-end states: what went wrong and the way forward. */
const DEAD_ENDS: Record<"invalid" | "expired" | "used", { heading: ReactNode; text: string }> = {
  invalid: {
    heading: (
      <>
        This link <Highlight>doesn&apos;t work</Highlight>
      </>
    ),
    text: "It may have been cut short when it was copied. Ask for a new link and use the button in the email.",
  },
  expired: {
    heading: (
      <>
        This link has <Highlight>expired</Highlight>
      </>
    ),
    text: "Reset links work for 1 hour. Ask for a new one and it'll arrive in a minute.",
  },
  used: {
    heading: (
      <>
        This link was <Highlight>already used</Highlight>
      </>
    ),
    text: "Each reset link works once. If you've just changed your password, sign in with it. Otherwise ask for a new link.",
  },
};

export default function ResetPasswordContent({ token }: { token: string }) {
  // The link's state comes straight from the RTK Query cache (never copied into state).
  const verification = useResetTokenState(token);
  // What happened when the form was submitted: saved, or the link stopped working meanwhile.
  // That's this screen's own outcome, so it's local state; it wins over the check above.
  const [outcome, setOutcome] = useState<"done" | Exclude<ResetTokenState, "valid"> | null>(null);

  const state: ScreenState =
    outcome ?? (verification.isError ? "unreachable" : (verification.data?.state ?? "checking"));

  return (
    <AuthShell tone="inverse" panel={<SignInPanel />}>
      {state === "checking" && (
        <p role="status" className="text-fg-secondary">
          Checking your link…
        </p>
      )}

      {state === "unreachable" && (
        <>
          <p role="alert" className="mb-6 text-fg-secondary">
            {NETWORK_ERROR_MESSAGE}
          </p>
          <Button
            text="Try again"
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => verification.refetch()}
          />
        </>
      )}

      {state === "valid" && (
        <>
          <h1 className={headingClass}>
            Choose a new <Highlight>password</Highlight>
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">
            Once it&apos;s saved, every device signed in to your account is signed out.
          </p>
          <ResetPasswordForm token={token} onDone={() => setOutcome("done")} onTokenRejected={setOutcome} />
        </>
      )}

      {(state === "invalid" || state === "expired" || state === "used") && (
        <>
          <h1 className={headingClass}>{DEAD_ENDS[state].heading}</h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">{DEAD_ENDS[state].text}</p>
          <ButtonLink text="Ask for a new link" href="/forgot-password" size="xl" className="w-full" />
        </>
      )}

      {state === "done" && (
        <>
          <h1 className={headingClass}>
            Password <Highlight>updated</Highlight>
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">
            Sign in with your new password. Any other device that was signed in has been signed out.
          </p>
          <ButtonLink text="Sign in" href="/login?reason=password-reset" size="xl" className="w-full" />
        </>
      )}

      {state !== "done" && (
        <p className="mt-6 text-center text-[15px] text-fg-secondary">
          <TextLink href="/login">Back to sign in</TextLink>
        </p>
      )}
    </AuthShell>
  );
}
