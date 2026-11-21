import type { ReactNode } from "react";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { GithubIcon } from "@/components/ui/icons/githubIcon";
import { Reveal } from "@/components/ui/reveal/reveal";
import { cn } from "@/utilities/helpers/cn";
import { buttonLift, tileLift } from "./landingMotion";

type FeatureCardProps = {
  title: string;
  body: string;
  /** Background and text colours of the card. */
  className: string;
  bodyClassName: string;
  children?: ReactNode;
};

function FeatureCard({ title, body, className, bodyClassName, children }: FeatureCardProps) {
  return (
    <div className={cn("rounded-card-lg p-8", tileLift, className)}>
      <h3 className="mb-2.5 text-[26px] font-bold tracking-[-0.02em]">{title}</h3>
      <p className={cn("text-base leading-relaxed", bodyClassName)}>{body}</p>
      {children && <div className="mt-5.5">{children}</div>}
    </div>
  );
}

const ghostSlot = "h-10 rounded-[10px] border border-line-subtle bg-surface-card";

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 pt-10 pb-28">
      <div className="mx-auto max-w-300">
        <Reveal
          as="h2"
          effect="rise"
          className="mx-auto mb-14 max-w-190 text-center text-display-section leading-none font-extrabold tracking-[-0.04em]"
        >
          Everything a small team{" "}
          <span className="relative inline-block">
            actually
            <span
              aria-hidden
              className="absolute -top-[0.55em] left-1/2 -translate-x-1/2 rotate-8 rounded-full bg-surface-inverse px-3 py-1.5 font-sans text-sm font-semibold tracking-normal whitespace-nowrap text-highlight"
            >
              Features
            </span>
          </span>{" "}
          needs
        </Reveal>

        <Reveal effect="rise" stagger={100} className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div
            className={cn(
              "flex flex-wrap items-center gap-7 rounded-card-lg border border-line-subtle bg-surface-card p-8 md:col-span-2",
              tileLift
            )}
          >
            <div className="flex-[1_1_260px]">
              <h3 className="mb-2.5 text-[26px] font-bold tracking-[-0.02em]">A board you can grab</h3>
              <p className="text-base leading-relaxed text-fg-secondary">
                Drag and drop between columns or reorder inside one. Every move lands exactly where you dropped it.
              </p>
            </div>
            <div aria-hidden className="flex flex-[1_1_280px] gap-2.5 rounded-[20px] bg-surface-page p-4">
              <div className="flex flex-1 flex-col gap-2">
                <span className={ghostSlot} />
                <span className={ghostSlot} />
                <span className="h-10 rounded-[10px] border-[1.5px] border-dashed border-line-strong" />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="h-10 rotate-4 rounded-[10px] bg-primary" />
                <span className={ghostSlot} />
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <span className="h-10 rounded-[10px] bg-highlight" />
                <span className="h-10 rounded-[10px] bg-highlight" />
                <span className="h-10 rounded-[10px] bg-highlight" />
              </div>
            </div>
          </div>

          <FeatureCard
            title="Priority at a glance"
            body="Tag every task low, medium or high, and the board tells you what to pick up first."
            className="bg-highlight text-fg-on-highlight"
            bodyClassName="text-fg-on-highlight-secondary"
          >
            <div aria-hidden className="flex flex-wrap gap-2 text-sm font-semibold">
              <span className="rounded-full bg-surface-inverse px-3.5 py-2 text-fg-on-inverse">High</span>
              <span className="rounded-full bg-surface-card px-3.5 py-2">Medium</span>
              <span className="rounded-full border-[1.5px] border-fg-primary px-3.5 py-2">Low</span>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Owners and members"
            body="The owner runs the project. Members work the board."
            className="bg-surface-inverse text-fg-on-inverse"
            bodyClassName="text-fg-muted-on-inverse"
          >
            <div aria-hidden className="flex flex-col gap-2.5 text-sm">
              <div className="flex items-center justify-between rounded-[14px] bg-surface-inverse-raised px-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-fg-on-primary">
                    MJ
                  </span>
                  Muizz
                </span>
                <span className="rounded-full bg-highlight px-2.5 py-0.5 text-xs font-semibold text-fg-on-highlight">
                  Owner
                </span>
              </div>
              <div className="flex items-center justify-between rounded-[14px] bg-surface-inverse-raised px-3 py-2.5">
                <span className="flex items-center gap-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface-page text-xs font-semibold text-fg-primary">
                    AO
                  </span>
                  Ada
                </span>
                <span className="rounded-full border border-fg-on-inverse/25 px-2.5 py-0.5 text-xs">Member</span>
              </div>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Invites that land"
            body="Add a teammate's email and they get a link straight into the project."
            className="border border-line-subtle bg-surface-card"
            bodyClassName="text-fg-secondary"
          >
            <div aria-hidden className="rounded-2xl bg-surface-page p-3.5 text-sm">
              <p className="font-semibold">You&apos;re invited to Website relaunch</p>
              <p className="mt-1 text-fg-muted">From Muizz · just now</p>
            </div>
          </FeatureCard>

          <FeatureCard
            title="Sign in your way"
            body="GitHub in one click, or email and password."
            className="bg-surface-sunken"
            bodyClassName="text-fg-secondary"
          >
            {/* Real links rather than the design's look-alike buttons, so nothing here is a dead end. */}
            <div className="flex flex-col gap-2.5">
              <ButtonLink
                href="/login"
                text="Continue with GitHub"
                variant="inverse"
                startIcon={<GithubIcon />}
                className={buttonLift}
              />
              <ButtonLink href="/register" text="Use email instead" variant="secondary" className={buttonLift} />
            </div>
          </FeatureCard>
        </Reveal>
      </div>
    </section>
  );
}
