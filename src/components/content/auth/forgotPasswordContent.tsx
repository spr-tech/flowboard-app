"use client";

import { useState } from "react";

import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { TextLink } from "@/components/ui/link/textLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { ForgotPasswordForm } from "./forms/forgotPasswordForm";
import { SignInPanel } from "./signInPanel";

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

/** /forgot-password: an email field, then "Check your inbox". */
export default function ForgotPasswordContent() {
  // The address the link went to, once sent. Only used to show it back to the person.
  const [sentTo, setSentTo] = useState<string | null>(null);

  return (
    <AuthShell tone="inverse" panel={<SignInPanel />}>
      {sentTo ? (
        <>
          <h1 className={headingClass}>
            Check your <Highlight>inbox</Highlight>
          </h1>
          <p className="mt-3.5 text-fg-secondary">
            If an account exists for <strong className="font-semibold text-fg-primary">{sentTo}</strong>, we&apos;ve
            sent a link to reset the password. It works once and expires in 1 hour.
          </p>
          <p className="mt-3 mb-8 text-fg-secondary">Nothing there? Check your spam folder, or try again.</p>
          <Button text="Try a different email" variant="secondary" size="lg" className="w-full" onClick={() => setSentTo(null)} />
        </>
      ) : (
        <>
          <h1 className={headingClass}>
            Forgot your <Highlight>password</Highlight>?
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">
            Enter the email you sign in with and we&apos;ll send you a link to choose a new one.
          </p>
          <ForgotPasswordForm onSent={setSentTo} />
        </>
      )}

      <p className="mt-6 text-center text-[15px] text-fg-secondary">
        Remembered it? <TextLink href="/login">Back to sign in</TextLink>
      </p>
    </AuthShell>
  );
}
