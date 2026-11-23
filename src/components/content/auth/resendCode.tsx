"use client";

import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { VerificationStatusResponse } from "@/models/responses/emailVerificationResponses";
import { useSendVerificationCodeMutation } from "@/services/authService";
import { useSecondsUntil } from "@/utilities/hooks/useSecondsUntil";

type ResendCodeProps = {
  status: VerificationStatusResponse;
  /** A new code went out: the page clears the boxes for it. */
  onSent: () => void;
};

/**
 * "Resend code", with the server's limits shown before anyone hits them: a 60-second countdown
 * after each send, and, after 3 in an hour, how long until the next. A refused send is a toast
 * (the base query's), and the status reloads.
 */
export function ResendCode({ status, onSent }: ResendCodeProps) {
  const [sendCode, { isLoading }] = useSendVerificationCodeMutation();
  const seconds = useSecondsUntil(status.resendAvailableAt);
  const isAtHourlyLimit = status.sendsLeftThisHour === 0 && seconds > 0;

  const resend = async () => {
    try {
      const sent = await sendCode().unwrap();
      toast({ type: "success", message: `We sent a new code to ${sent.email}.` });
      onSent();
    } catch {
      // The base query has shown why (too soon, or the hourly limit).
    }
  };

  const minutes = Math.ceil(seconds / 60);
  return (
    <div className="flex flex-col items-center gap-1.5 text-center">
      <Button
        text={seconds > 0 && !isAtHourlyLimit ? `Resend code in ${seconds}s` : "Resend code"}
        variant="ghost"
        size="md"
        onClick={resend}
        isLoading={isLoading}
        disabled={seconds > 0}
      />
      {isAtHourlyLimit && (
        <p role="status" className="text-sm text-fg-secondary">
          You&apos;ve asked for 3 codes in the last hour. You can ask again in {minutes}{" "}
          {minutes === 1 ? "minute" : "minutes"}.
        </p>
      )}
    </div>
  );
}
