"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";
import { cardPose, currentCard, dealtFromScroll, DECK_MIN_TOP_PX, type PinnedDeck } from "./phoneDeckMotion";
import { WHY_CARDS } from "./whyCards";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
/** The phone deck only exists under md; from there the hover fan takes over. */
const MD_UP = "(min-width: 48rem)";

/**
 * "Why Flowboard" on phones (under md). The server renders a plain vertical list of the six
 * cards, which is also what screen readers, no-JavaScript and reduced-motion visitors get.
 *
 * After mount (and only with motion allowed) the root gets data-mode="stack": the track grows to
 * 6 × 55svh, the deck pins in the middle of the screen, and scrolling through the track deals the
 * cards one at a time onto a pile. One passive scroll listener schedules at most one
 * requestAnimationFrame; each frame reads the track's position once, then writes only transform
 * and opacity (the pinned deck's size is read on resize only). React never re-renders while
 * scrolling. The list keeps its order in the DOM, so a screen reader still reads
 * it as a normal list.
 */
export function WhyPhoneDeck() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>("[data-deck-card]"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-deck-dot]"));
    const reduced = window.matchMedia(REDUCED_MOTION);
    const wide = window.matchMedia(MD_UP);
    const sticky = root.firstElementChild as HTMLElement;
    let frame = 0;
    let lastCurrent = -2;
    let pinned: PinnedDeck = { top: DECK_MIN_TOP_PX, height: 0 };
    let enterFromPx = window.innerHeight;
    const measure = () => {
      pinned = { top: parseFloat(getComputedStyle(sticky).top) || DECK_MIN_TOP_PX, height: sticky.offsetHeight };
      enterFromPx = window.innerHeight - pinned.top; // from the bottom of the screen
    };

    const render = () => {
      frame = 0;
      const { top, height } = root.getBoundingClientRect(); // the one read per frame
      const dealt = dealtFromScroll(top, height, pinned, cards.length);
      cards.forEach((card, index) => {
        const pose = cardPose(index, dealt, enterFromPx);
        card.style.transform = `translate3d(0, ${pose.y.toFixed(1)}px, 0) rotate(${pose.rotate.toFixed(2)}deg) scale(${pose.scale.toFixed(3)})`;
        card.style.opacity = String(pose.opacity);
      });
      const current = currentCard(dealt, cards.length);
      if (current !== lastCurrent) {
        lastCurrent = current;
        dots.forEach((dot, index) => {
          dot.dataset.state = index === current ? "current" : index < current ? "dealt" : "waiting";
        });
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };
    const onResize = () => {
      measure();
      schedule();
    };

    const start = () => {
      root.dataset.mode = "stack";
      lastCurrent = -2;
      measure();
      render(); // before the next paint, so the list never flashes as a pile without poses
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", onResize, { passive: true });
    };
    const stop = () => {
      delete root.dataset.mode;
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", onResize);
      cards.forEach((card) => card.removeAttribute("style"));
    };
    const update = () => {
      const shouldStack = !reduced.matches && !wide.matches;
      if (shouldStack && root.dataset.mode !== "stack") start();
      else if (!shouldStack && root.dataset.mode === "stack") stop();
    };

    update();
    reduced.addEventListener("change", update);
    wide.addEventListener("change", update);
    return () => {
      reduced.removeEventListener("change", update);
      wide.removeEventListener("change", update);
      stop();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      // Clipped sideways only, so a turned card never widens the page; a card sliding in from
      // below may pass over the next section for a moment rather than be cut off.
      className="group/deck w-full overflow-x-clip md:hidden data-[mode=stack]:h-[330svh]"
      style={cssVars({ "--deck-min-top": `${DECK_MIN_TOP_PX}px` })}
    >
      {/* The pinned part (pile and dots, 272px tall), centred on the screen. */}
      <div className="group-data-[mode=stack]/deck:sticky group-data-[mode=stack]/deck:top-[max(var(--deck-min-top),calc(50svh-136px))]">
        <div className="relative mx-auto w-full max-w-80">
          {/* The empty spot the first card lands on (stack mode only). */}
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 hidden h-60 rounded-[22px] border-2 border-dashed border-fg-on-inverse/20 group-data-[mode=stack]/deck:block"
          />
          <ul
            aria-label="What your team gets"
            className="flex flex-col gap-3 group-data-[mode=stack]/deck:relative group-data-[mode=stack]/deck:block group-data-[mode=stack]/deck:h-60"
          >
            {WHY_CARDS.map((card) => (
              <li
                key={card.name}
                data-deck-card
                className={cn(
                  "flex flex-col gap-3 rounded-[22px] p-5 shadow-2xl",
                  "group-data-[mode=stack]/deck:absolute group-data-[mode=stack]/deck:inset-0 group-data-[mode=stack]/deck:origin-top group-data-[mode=stack]/deck:justify-between group-data-[mode=stack]/deck:opacity-0 group-data-[mode=stack]/deck:will-change-transform",
                  card.colours
                )}
              >
                <span className={cn("text-[13px] font-semibold", card.labelColour)}>{card.label}</span>
                <span className="flex flex-col gap-2">
                  <span className="font-heading text-[26px] leading-none font-extrabold tracking-[-0.03em]">
                    {card.name}
                  </span>
                  <span className={cn("text-[15px] leading-snug", card.labelColour)}>{card.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {/* Progress, for sighted visitors only: the list itself says how many there are. */}
        <div aria-hidden className="mt-6 hidden justify-center gap-2.5 group-data-[mode=stack]/deck:flex">
          {WHY_CARDS.map((card) => (
            <span
              key={card.name}
              data-deck-dot
              data-state="waiting"
              className="size-2 rounded-full bg-fg-on-inverse/20 transition-[background-color,transform] duration-200 data-[state=current]:scale-125 data-[state=current]:bg-highlight data-[state=dealt]:bg-fg-on-inverse/50"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
