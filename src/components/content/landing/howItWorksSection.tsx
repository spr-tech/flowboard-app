import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/ui/reveal/reveal";
import { cn } from "@/utilities/helpers/cn";

const tones = {
  light: {
    card: "border border-line-subtle bg-surface-card",
    number: "text-surface-sunken",
    step: "text-primary",
    body: "text-fg-secondary",
  },
  primary: {
    card: "bg-primary text-fg-on-primary",
    number: "text-fg-on-primary/15",
    step: "text-fg-on-primary",
    body: "text-fg-on-primary",
  },
  inverse: {
    card: "bg-surface-inverse text-fg-on-inverse",
    number: "text-fg-on-inverse/7",
    step: "text-highlight",
    body: "text-fg-muted-on-inverse",
  },
} as const;

type StepCardProps = {
  number: string;
  tone: keyof typeof tones;
  title: string;
  body: string;
  /** A small picture of the step. Decorative, so it's hidden from screen readers. */
  mock: ReactNode;
};

function StepCard({ number, tone, title, body, mock }: StepCardProps) {
  const colours = tones[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-card-lg p-7", colours.card)}>
      <span
        aria-hidden
        className={cn("absolute top-1.5 right-5 font-heading text-[92px] leading-none font-extrabold", colours.number)}
      >
        {number}
      </span>
      <div aria-hidden className="relative mb-6.5">
        {mock}
      </div>
      <p className={cn("relative mb-1.5 text-[13px] font-semibold", colours.step)}>Step {Number(number)} of 3</p>
      <h3 className="relative mb-2 text-2xl font-bold tracking-[-0.02em]">{title}</h3>
      <p className={cn("relative text-base leading-relaxed", colours.body)}>{body}</p>
    </div>
  );
}

const fakeFieldLabel = "mb-2 block text-[13px]";
const fakeField = "flex h-11 items-center rounded-[10px] px-3 text-[15px]";

export function HowItWorksSection() {
  return (
    <section id="how" className="px-6 py-20">
      <div className="mx-auto max-w-300">
        <Reveal effect="rise" className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className="max-w-160 text-display-section leading-none font-extrabold tracking-[-0.04em]">
            Three steps. <span className="text-primary">No setup call.</span>
          </h2>
          <p className="max-w-95 text-[17px] leading-relaxed text-fg-secondary">
            From an empty account to a team moving tasks in a few minutes.
          </p>
        </Reveal>

        <Reveal effect="rise" stagger={120} className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5">
          <StepCard
            number="01"
            tone="light"
            title="Create a project"
            body="Name it, pick a colour, and you get a board with To do, In progress and Done ready to go."
            mock={
              <div className="rounded-card bg-surface-page p-4.5">
                <span className={cn(fakeFieldLabel, "text-fg-secondary")}>Project name</span>
                <span className={cn(fakeField, "border-[1.5px] border-fg-primary bg-surface-card")}>
                  Website relaunch
                </span>
                <span className="mt-3 flex gap-2">
                  <span className="size-6 rounded-full bg-primary" />
                  <span className="size-6 rounded-full bg-highlight outline-2 outline-offset-2 outline-fg-primary" />
                  <span className="size-6 rounded-full bg-status-low-fg" />
                </span>
              </div>
            }
          />
          <StepCard
            number="02"
            tone="primary"
            title="Invite your team"
            body="Send an email invite. Teammates join the project as members and see the same board."
            mock={
              <div className="rounded-card bg-surface-inverse p-4.5">
                <span className={cn(fakeFieldLabel, "text-fg-muted-on-inverse")}>Invite by email</span>
                <span className="flex gap-2">
                  <span
                    className={cn(
                      fakeField,
                      "min-w-0 flex-1 border border-fg-on-inverse/20 bg-surface-inverse-raised text-fg-on-inverse"
                    )}
                  >
                    ada@team.dev
                  </span>
                  <span className="flex h-11 items-center rounded-[10px] bg-highlight px-4 text-sm font-semibold text-fg-on-highlight">
                    Send
                  </span>
                </span>
              </div>
            }
          />
          <StepCard
            number="03"
            tone="inverse"
            title="Drag it to done"
            body="Grab a card, drop it in the next column. The order saves for everyone on the project."
            mock={
              <div className="flex items-center gap-2.5 rounded-card bg-surface-inverse-raised p-4.5 text-sm font-semibold">
                <span className="flex-1 -rotate-3 rounded-[10px] bg-surface-page p-3 text-fg-primary">
                  Fix the checkout bug
                </span>
                <ArrowRight className="size-7 text-highlight" strokeWidth={2.5} />
                <span className="rounded-[10px] bg-highlight p-3 text-fg-on-highlight">Done</span>
              </div>
            }
          />
        </Reveal>
      </div>
    </section>
  );
}
