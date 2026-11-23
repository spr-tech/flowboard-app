"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/layouts/authShell/authShell";
import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { TextLink } from "@/components/ui/link/textLink";
import { toast } from "@/components/ui/toast/toast";
import { Highlight } from "@/components/ui/typography/highlight";
import { useVerificationStatus } from "@/services/authService";
import { NETWORK_ERROR_MESSAGE } from "@/utilities/constants/errorMessages";
import { DEFAULT_SIGNED_IN_PATH, safeCallbackUrl } from "@/utilities/helpers/safeCallbackUrl";
import { VerifyCodeForm } from "./forms/verifyCodeForm";
import { ResendCode } from "./resendCode";
import { VerifyEmailPanel } from "./verifyEmailPanel";

const headingClass = "text-5xl leading-none font-extrabold tracking-[-0.045em]";

/** /verify-email: enter the emailed code. Signed-in only (middleware sends others to /login). */
export default function VerifyEmailContent({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const status = useVerificationStatus();
  // Bumped when a new code is sent, so the form starts over (empty boxes, no old error).
  const [round, setRound] = useState(0);

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
          <p className="mt-3.5 mb-8 text-fg-secondary">{status.data.email} is all set. You can invite people now.</p>
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
            We sent a 6-digit code to <strong className="font-semibold text-fg-primary">{status.data.email}</strong>.
          </p>

          <VerifyCodeForm key={round} onVerified={onVerified} />

          <div className="mt-5 flex flex-col items-center gap-3">
            <ResendCode status={status.data} onSent={() => setRound((value) => value + 1)} />
            <TextLink href={DEFAULT_SIGNED_IN_PATH} className="text-[15px]">
              Do this later
            </TextLink>
          </div>
        </>
      )}
    </AuthShell>
  );
}
