import { Check, CheckCheck } from "lucide-react";

import { FlipCard } from "@/components/ui/flipcard/flipCard";
import { Rise } from "@/components/ui/motion/rise";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";

const teammates = [
  { initials: "AO", className: "bg-status-high text-status-high-fg" },
  { initials: "MJ", className: "bg-highlight text-fg-on-highlight" },
  { initials: "TK", className: "bg-primary text-fg-on-primary" },
];

/** Left half of the sign-in page: "Pick up where you left off." with a card flipping to done. */
export function SignInPanel() {
  return (
    <>
      <div>
        <p className="font-heading text-[clamp(44px,5.4vw,78px)] leading-none font-extrabold tracking-tighter">
          <Rise delay={0.05}>Pick</Rise> <Rise delay={0.12}>up</Rise>
          <br />
          <FlipCard
            className="my-[0.08em] mr-[0.12em] h-[0.84em] w-[3.1em]"
            frontClassName="bg-surface-page text-fg-primary font-sans text-[0.24em] font-semibold tracking-normal"
            backClassName="bg-highlight text-fg-on-highlight font-sans text-[0.24em] font-semibold tracking-normal"
            front={
              <>
                <span className="rounded-full bg-status-medium px-[0.8em] py-[0.3em] text-status-medium-fg">
                  In progress
                </span>
                Invite email
              </>
            }
            back={
              <>
                <Check className="size-[1.5em]" strokeWidth={3} />
                Done
              </>
            }
          />
          <Rise delay={0.2}>where</Rise>
          <br />
          <Rise delay={0.28}>you</Rise>{" "}
          <Rise delay={0.36} className="text-primary">
            left
          </Rise>{" "}
          <Rise delay={0.44}>off.</Rise>
        </p>
        <p className="mt-6 max-w-100 text-[17px] leading-relaxed text-fg-muted-on-inverse">
          Your boards, tasks and team are right where you put them.
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <span className="flex">
          {teammates.map((person, index) => (
            <span
              key={person.initials}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full border-3 border-surface-inverse text-[13px] font-semibold",
                person.className,
                index > 0 && "-ml-3"
              )}
            >
              {person.initials}
            </span>
          ))}
        </span>
        <span className="text-sm text-fg-muted-on-inverse">Your team is already on the board</span>
      </div>

      <span
        aria-hidden
        className="absolute top-30 right-12 flex size-16 animate-wiggle items-center justify-center rounded-[20px] bg-highlight text-fg-on-highlight"
        style={cssVars({ "--r": "12deg" })}
      >
        <CheckCheck className="size-7.5" strokeWidth={2.4} />
      </span>
      <span
        aria-hidden
        className="absolute right-18 bottom-30 animate-wiggle rounded-[14px] bg-primary px-3.5 py-2.5 text-sm font-semibold text-fg-on-primary"
        style={{ ...cssVars({ "--r": "-10deg" }), animationDelay: "-1.4s" }}
      >
        High priority
      </span>
    </>
  );
}
