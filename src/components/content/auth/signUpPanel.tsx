import { Pin } from "lucide-react";

import { Rise } from "@/components/ui/motion/rise";
import { Highlight } from "@/components/ui/typography/highlight";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";

const steps = [
  { title: "Create your account", note: "You're here now" },
  { title: "Name your first project" },
  { title: "Invite your team by email" },
];

/** Left half of the sign-up page: "Your board is 3 steps away." with the steps listed. */
export function SignUpPanel() {
  return (
    <>
      <p className="font-heading text-[clamp(44px,5.4vw,78px)] leading-none font-extrabold tracking-tighter">
        <Rise delay={0.05}>Your</Rise> <Rise delay={0.12}>board</Rise>
        <br />
        <Rise delay={0.2}>is</Rise>{" "}
        <span
          aria-hidden
          className="inline-flex size-[0.8em] animate-wiggle items-center justify-center rounded-[0.24em] bg-highlight align-middle text-fg-on-highlight"
          style={cssVars({ "--r": "-8deg" })}
        >
          <span className="text-[0.5em]">3</span>
        </span>
        <span className="sr-only">3</span> <Rise delay={0.28}>steps</Rise>
        <br />
        <Rise delay={0.36}>
          <Highlight tone="inverse" isTilted={false} className="rounded-[0.12em]">
            away.
          </Highlight>
        </Rise>
      </p>

      <ol className="flex max-w-105 flex-col gap-2.5">
        {steps.map((step, index) => {
          const isCurrent = index === 0;
          return (
            <li
              key={step.title}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex animate-rise items-center gap-3.5 rounded-card px-4 py-3.5",
                isCurrent ? "bg-surface-page text-fg-primary" : "bg-surface-inverse/20",
              )}
              style={{ animationDelay: `${0.5 + index * 0.1}s` }}
            >
              <span
                className={cn(
                  "inline-flex size-9 shrink-0 items-center justify-center rounded-xl font-bold",
                  isCurrent
                    ? "bg-highlight text-fg-on-highlight"
                    : "border-[1.5px] border-fg-on-primary/60",
                )}
              >
                {index + 1}
              </span>
              <span>
                <span className="block text-[15px] font-semibold">{step.title}</span>
                {step.note && <span className="block text-[13px] text-fg-muted">{step.note}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <span
        aria-hidden
        className="absolute top-27.5 right-14 flex size-16 animate-wiggle items-center justify-center rounded-full bg-surface-inverse text-highlight"
        style={{ ...cssVars({ "--r": "10deg" }), animationDelay: "-1s" }}
      >
        <Pin className="size-7.5" strokeWidth={2.2} />
      </span>
    </>
  );
}
