"use client";

import { useState, type ReactNode } from "react";

import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Highlight } from "@/components/ui/typography/highlight";
import { useVerifyEmailLinkMutation } from "@/services/authService";
import { isAppError } from "@/utilities/helpers/applyApiError";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { DEFAULT_SIGNED_IN_PATH } from "@/utilities/helpers/safeCallbackUrl";
import { VerifyEmailPanel } from "./verifyEmailPanel";

type DeadEnd = "expired" | "used" | "invalid";

/** The server's error codes for a link that doesn't work. */
const TOKEN_ERROR_STATES: Record<string, DeadEnd> = {
  TOKEN_EXPIRED: "expired",
  TOKEN_USED: "used",
  TOKEN_INVALID: "invalid",
};

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

const DEAD_ENDS: Record<DeadEnd, { heading: ReactNode; text: string }> = {
  expired: {
    heading: (
      <>
        This link has <Highlight>expired</Highlight>
      </>
    ),
    text: "Confirm links work for 24 hours. Send yourself a new code from Flowboard.",
  },
  used: {
    heading: (
      <>
        This link was <Highlight>already used</Highlight>
      </>
    ),
    text: "It has been used, or a newer email replaced it. If you've confirmed your email already, you're all set.",
  },
  invalid: {
    heading: (
      <>
        This link <Highlight>doesn&apos;t work</Highlight>
      </>
    ),
    text: "It may have been cut short when it was copied. Use the button in your latest email, or send a new code.",
  },
};

/**
 * /verify-email/link/[token], from the email's "Confirm my email" button. Nothing happens until the
 * button here is clicked (a POST), so email scanners that open every link can't use it up.
 */
export default function VerifyEmailLinkContent({ token }: { token: string }) {
  const [verifyLink, { isLoading }] = useVerifyEmailLinkMutation();
  // This screen's own outcome, so local state: confirmed (with the address), or why not.
  const [outcome, setOutcome] = useState<{ email: string } | DeadEnd | null>(null);
  const [isUnreachable, setIsUnreachable] = useState(false);

  const confirm = async () => {
    setIsUnreachable(false);
    try {
      setOutcome(await verifyLink({ token }).unwrap());
    } catch (error) {
      const deadEnd = isAppError(error) ? TOKEN_ERROR_STATES[error.code] : undefined;
      if (deadEnd) setOutcome(deadEnd);
      else setIsUnreachable(true);
    }
  };

  return (
    <AuthShell tone="brandDeep" panel={<VerifyEmailPanel />}>
      {outcome === null && (
        <>
          <h1 className={headingClass}>
            Confirm your <Highlight>email</Highlight>
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">One click and your email is confirmed.</p>
          {isUnreachable && (
            <p role="alert" className="mb-5 text-sm font-medium text-danger">
              {NETWORK_ERROR_MESSAGE}
            </p>
          )}
          <Button
            text="Confirm my email"
            variant="inverse"
            size="xl"
            className="w-full"
            onClick={confirm}
            isLoading={isLoading}
          />
        </>
      )}

      {typeof outcome === "object" && outcome !== null && (
        <>
          <h1 className={headingClass}>
            Email <Highlight>confirmed</Highlight>
          </h1>
          <p role="status" className="mt-3.5 mb-8 text-fg-secondary">
            {outcome.email} is all set. You can invite people now.
          </p>
          <ButtonLink text="Go to Flowboard" href={DEFAULT_SIGNED_IN_PATH} size="xl" className="w-full" />
        </>
      )}

      {typeof outcome === "string" && (
        <>
          <h1 className={headingClass}>{DEAD_ENDS[outcome].heading}</h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">{DEAD_ENDS[outcome].text}</p>
          <ButtonLink text="Send a new code" href="/verify-email" size="xl" className="w-full" />
        </>
      )}
    </AuthShell>
  );
}
