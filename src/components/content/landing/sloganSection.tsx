import { Check, CheckCheck, Pin } from "lucide-react";

import { StatusChip } from "@/components/ui/chip/statusChip";
import { FlipCard } from "@/components/ui/flipcard/flipCard";
import { Reveal } from "@/components/ui/reveal/reveal";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";

const lineClasses = "flex flex-wrap items-center gap-[0.18em]";
const faceText = "font-sans text-[0.17em] font-semibold tracking-normal rounded-[1.2em]";

/** "Plan the work / move the cards / ship it" in giant type, with stickers inside the words. */
export function SloganSection() {
  return (
    <section aria-label="Plan the work, move the cards, ship it" className="px-6 pt-30 pb-10">
      <div className="mx-auto flex max-w-300 flex-col gap-[0.06em] font-heading text-display-statement leading-none font-extrabold tracking-[-0.055em]">
        <Reveal as="p" effect="slide-left" className={cn(lineClasses, "pl-[4%]")}>
          Plan
          <span
            aria-hidden
            className="inline-flex size-[0.78em] animate-wiggle items-center justify-center rounded-full bg-primary text-fg-on-primary"
            style={cssVars({ "--r": "-10deg" })}
          >
            <Pin className="size-[52%]" strokeWidth={2.4} />
          </span>
          the work
        </Reveal>
        <Reveal as="p" effect="slide-right" delay={120} className={cn(lineClasses, "justify-center")}>
          move
          <FlipCard
            className="h-[0.82em] w-[2.3em]"
            frontClassName={cn(faceText, "border-[0.025em] border-fg-primary bg-surface-card text-fg-primary")}
            backClassName={cn(faceText, "bg-highlight text-fg-on-highlight")}
            front={
              <>
                <StatusChip status="high" label="To do" className="px-[0.8em] py-[0.3em] text-[1em]" />
                Fix sign-in
              </>
            }
            back={
              <>
                <Check className="size-[1.6em]" strokeWidth={3} />
                Done
              </>
            }
          />
          the cards
        </Reveal>
        <Reveal as="p" effect="slide-left" delay={240} className={cn(lineClasses, "justify-end pr-[4%]")}>
          <span className="text-primary">ship</span>it
          <span
            aria-hidden
            className="inline-flex size-[0.8em] animate-wiggle items-center justify-center rounded-[0.24em] bg-surface-inverse text-highlight"
            style={{ ...cssVars({ "--r": "12deg" }), animationDelay: "-1.5s" }}
          >
            <CheckCheck className="size-[52%]" strokeWidth={2.4} />
          </span>
        </Reveal>
      </div>
    </section>
  );
}
