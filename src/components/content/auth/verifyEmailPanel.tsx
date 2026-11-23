import { MailCheck } from "lucide-react";

import { Rise } from "@/components/ui/motion/rise";
import { Highlight } from "@/components/ui/typography/highlight";
import { cssVars } from "@/utilities/helpers/cssVars";

/** Left half of the confirm-your-email pages: "One code and you're in." with a wiggling envelope. */
export function VerifyEmailPanel() {
  return (
    <>
      <p className="font-heading text-[clamp(44px,5.4vw,78px)] leading-none font-extrabold tracking-tighter">
        <Rise delay={0.05}>One</Rise> <Rise delay={0.12}>code</Rise>
        <br />
        <Rise delay={0.2}>and</Rise> <Rise delay={0.28}>you&apos;re</Rise>
        <br />
        <Rise delay={0.36}>
          <Highlight tone="inverse" isTilted={false} className="rounded-[0.12em]">
            in.
          </Highlight>
        </Rise>
      </p>

      <p className="max-w-95 animate-rise text-[17px] leading-relaxed opacity-90" style={{ animationDelay: "0.5s" }}>
        Confirming your email lets you invite your team, and keeps your account yours.
      </p>

      <span
        aria-hidden
        className="absolute top-27.5 right-14 flex size-16 animate-wiggle items-center justify-center rounded-full bg-surface-inverse text-highlight"
        style={{ ...cssVars({ "--r": "10deg" }), animationDelay: "-1s" }}
      >
        <MailCheck className="size-7.5" strokeWidth={2.2} />
      </span>
    </>
  );
}
