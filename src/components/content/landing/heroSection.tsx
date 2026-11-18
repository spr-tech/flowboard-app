import { Check, Pin } from "lucide-react";

import { ArrowBadge } from "@/components/ui/button/arrowBadge";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Rise } from "@/components/ui/motion/rise";
import { Highlight } from "@/components/ui/typography/highlight";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";
import { BoardPreview } from "./boardPreview";

const stickerBase = "absolute z-20 hidden animate-wiggle md:flex";

export function HeroSection() {
  return (
    <section id="top" className="relative px-6 pt-14 pb-10">
      <div className="relative mx-auto max-w-300 text-center">
        <p className="inline-flex items-center gap-2.5 rounded-full border border-line-subtle bg-surface-card py-1.5 pr-4 pl-1.5 text-sm text-fg-secondary">
          <span className="rounded-full bg-surface-inverse px-2.5 py-1 text-xs font-semibold text-highlight">
            New
          </span>
          Due dates, assignees and a done column on every board
        </p>

        {/* Stickers around the headline; desktop only, decorative. "High priority" sits level with
            the badge, above the headline, so it never covers a word whatever the line wrapping. */}
        <span
          aria-hidden
          className={cn(stickerBase, "top-30 left-[2%] size-16 items-center justify-center rounded-full bg-primary text-fg-on-primary")}
          style={cssVars({ "--r": "-14deg" })}
        >
          <Pin className="size-7.5" strokeWidth={2.2} />
        </span>
        <span
          aria-hidden
          className={cn(stickerBase, "top-1 right-[3%] rounded-[14px] bg-surface-inverse px-3.5 py-2.5 text-sm font-semibold text-highlight")}
          style={{ ...cssVars({ "--r": "10deg" }), animationDelay: "-1.2s" }}
        >
          High priority
        </span>
        <span
          aria-hidden
          className={cn(stickerBase, "top-75 left-[7%] size-14 items-center justify-center rounded-[18px] bg-highlight text-fg-on-highlight")}
          style={{ ...cssVars({ "--r": "8deg" }), animationDelay: "-2.1s" }}
        >
          <Check className="size-7" strokeWidth={2.6} />
        </span>
        <span
          aria-hidden
          className={cn(stickerBase, "top-72.5 right-[8%] items-center text-[13px] font-semibold")}
          style={{ ...cssVars({ "--r": "-8deg" }), animationDelay: "-0.6s" }}
        >
          <span className="inline-flex size-10 items-center justify-center rounded-full border-3 border-surface-page bg-status-high text-status-high-fg">
            AO
          </span>
          <span className="-ml-3 inline-flex size-10 items-center justify-center rounded-full border-3 border-surface-page bg-surface-inverse text-fg-on-inverse">
            MJ
          </span>
          <span className="-ml-3 inline-flex size-10 items-center justify-center rounded-full border-3 border-surface-page bg-highlight text-[15px] text-fg-on-highlight">
            +
          </span>
        </span>

        <h1 className="mx-auto mt-7 max-w-265 text-display-hero leading-[0.98] font-extrabold tracking-[-0.045em]">
          <Rise delay={0.05}>Move</Rise> <Rise delay={0.12}>your</Rise>{" "}
          <Rise delay={0.19}>team&apos;s</Rise> <Rise delay={0.26}>work</Rise>{" "}
          <Rise delay={0.33}>from</Rise>{" "}
          <Rise delay={0.45}>
            <Highlight className="px-[0.16em]">idea</Highlight>
          </Rise>{" "}
          <Rise delay={0.52}>to</Rise>{" "}
          <Rise delay={0.62} className="relative">
            done.
            <svg
              aria-hidden
              viewBox="0 0 300 30"
              preserveAspectRatio="none"
              className="absolute -bottom-[0.12em] -left-[2%] h-[0.32em] w-[104%]"
            >
              <path
                d="M4 20 C 70 4, 160 6, 296 14"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className="stroke-primary"
              />
            </svg>
          </Rise>
        </h1>
        <p className="mx-auto mt-7 max-w-150 text-lg leading-relaxed text-fg-secondary">
          Flowboard is a Kanban workspace for small teams. Make a project, invite your people by
          email, and drag tasks across the board until they&apos;re shipped.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink
            href="/register"
            text="Create a free board"
            variant="inverse"
            size="xl"
            endIcon={<ArrowBadge />}
          />
          <ButtonLink href="#how" text="See how it works" variant="outline" size="xl" />
        </div>

        <BoardPreview />
      </div>
    </section>
  );
}
