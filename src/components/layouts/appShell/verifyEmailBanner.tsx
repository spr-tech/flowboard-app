"use client";

import { MailWarning, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { toast } from "@/components/ui/toast/toast";
import { useMe } from "@/services/accountService";
import { useSendVerificationCodeMutation } from "@/services/authService";
import { useSessionFlag } from "@/utilities/hooks/useSessionFlag";

export const BANNER_DISMISSED_KEY = "flowboard:verify-email-banner-dismissed";

/**
 * Across the top of every signed-in page until the email is confirmed: "Confirm your email to
 * invite people." Dismissing it lasts for this tab's session; it's back on the next visit.
 */
export function VerifyEmailBanner() {
  const { data: me } = useMe();
  const pathname = usePathname();
  const [isDismissed, dismiss] = useSessionFlag(BANNER_DISMISSED_KEY);
  const [sendCode, { isLoading }] = useSendVerificationCodeMutation();

  if (!me || me.emailVerified || isDismissed) return null;

  const resend = async () => {
    try {
      const sent = await sendCode().unwrap();
      toast({ type: "success", message: `We sent a new code to ${sent.email}.` });
    } catch {
      // The base query has shown why (too soon, or the hourly limit).
    }
  };

  return (
    <section
      aria-label="Confirm your email"
      className="flex flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-line-subtle bg-status-medium px-4 py-3 text-status-medium-fg md:px-8"
    >
      <MailWarning aria-hidden className="size-5 shrink-0" />
      <p className="min-w-0 flex-1 basis-48 text-sm font-semibold">Confirm your email to invite people.</p>
      <div className="flex items-center gap-2">
        <ButtonLink
          text="Enter code"
          href={`/verify-email?callbackUrl=${encodeURIComponent(pathname)}`}
          variant="inverse"
          size="sm"
        />
        <Button text="Resend code" variant="ghost" size="sm" onClick={resend} isLoading={isLoading} />
        <Button
          aria-label="Dismiss for now"
          startIcon={<X aria-hidden />}
          variant="ghost"
          size="sm"
          onClick={dismiss}
        />
      </div>
    </section>
  );
}
