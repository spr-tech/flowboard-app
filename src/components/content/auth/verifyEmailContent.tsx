"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { toast } from "@/components/ui/toast/toast";
import { Highlight } from "@/components/ui/typography/highlight";
import { useSendVerificationCodeMutation, useVerificationStatus } from "@/services/authService";
import { VERIFICATION_SENDS_PER_HOUR } from "@/utilities/constants/emailVerification";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { VerifyCodeForm } from "./forms/verifyCodeForm";
import { ResendCode } from "./resendCode";
import { VerifyEmailActions } from "./verifyEmailActions";
import { VerifyEmailPanel } from "./verifyEmailPanel";

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

type VerifyEmailContentProps = {
  /** Where to go once confirmed; checked before use. The (app) layout sets it when it sends people here. */
  callbackUrl?: string;
  isGoogleEnabled?: boolean;
};

/**
 * /verify-email: enter the emailed code. Signed-in only (middleware sends others to /login).
 * Until the email is confirmed, this page is the whole app (the verification gate): enter the code,
 * resend it, use the email's link, continue with Google instead, use a different email, or sign out.
 */
export default function VerifyEmailContent({ callbackUrl, isGoogleEnabled = false }: VerifyEmailContentProps) {
  const router = useRouter();
  const status = useVerificationStatus();
  const [sendCode] = useSendVerificationCodeMutation();
  // Bumped when a new code is sent, so the form starts over (empty boxes, no old error).
  const [round, setRound] = useState(0);
  const hasAutoSent = useRef(false);

  // No code sent in the last hour means none is waiting (codes last 15 minutes): an account from
  // before the gate, or an invite sign-up that never joined. Send one, once.
  const needsFirstCode = Boolean(
    status.data && !status.data.isVerified && status.data.sendsLeftThisHour === VERIFICATION_SENDS_PER_HOUR
  );
  useEffect(() => {
    if (!needsFirstCode || hasAutoSent.current) return;
    hasAutoSent.current = true;
    // A failure shows its toast through the error wrapper, and Resend stays available.
    sendCode()
      .unwrap()
      .then(() => setRound((value) => value + 1))
      .catch(() => {});
  }, [needsFirstCode, sendCode]);

  const destination = () => safeCallbackUrl(callbackUrl, window.location.origin);
  const onVerified = () => {
    toast({ type: "success", message: "Email confirmed" });
    router.push(destination());
    router.refresh();
  };

  return (
    <AuthShell tone="brandDeep" panel={<VerifyEmailPanel />}>
      {status.isLoading && (
        <p role="status" className="text-fg-secondary">
          Loading…
        </p>
      )}

      {status.isError && !status.data && (
        <>
          <p role="alert" className="mb-6 text-fg-secondary">
            {NETWORK_ERROR_MESSAGE}
          </p>
          <Button text="Try again" variant="secondary" size="lg" className="w-full" onClick={() => status.refetch()} />
        </>
      )}

      {status.data?.isVerified && (
        <>
          <h1 className={headingClass}>
            Your email is <Highlight>confirmed</Highlight>
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">{status.data.email} is all set.</p>
          {/* Only rendered in the browser (the status loads there), so window is available. */}
          <ButtonLink text="Continue" href={destination()} size="xl" className="w-full" />
        </>
      )}

      {status.data && !status.data.isVerified && (
        <>
          <h1 className={headingClass}>
            Confirm your <Highlight>email</Highlight>
          </h1>
          <p className="mt-3.5 mb-8 text-fg-secondary">
            {needsFirstCode ? "We're sending" : "We sent"} a 6-digit code to{" "}
            <strong className="font-semibold text-fg-primary">{status.data.email}</strong>. Enter it to start using
            Flowboard.
          </p>

          <VerifyCodeForm key={round} onVerified={onVerified} />

          <div className="mt-5 flex flex-col items-center gap-3">
            <ResendCode status={status.data} onSent={() => setRound((value) => value + 1)} />
          </div>

          <VerifyEmailActions email={status.data.email} callbackUrl={callbackUrl} isGoogleEnabled={isGoogleEnabled} />
        </>
      )}
    </AuthShell>
  );
}
