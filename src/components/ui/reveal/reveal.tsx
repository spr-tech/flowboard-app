"use client";

import { useCallback, useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

import { cssVars } from "@/utilities/helpers/cssVars";

/** Every effect. Each one except "fan" needs a matching `@keyframes reveal-<effect>` in globals.css. */
export const REVEAL_EFFECTS = ["rise", "slide-left", "slide-right", "scale", "fan", "fade"] as const;

export type RevealEffect = (typeof REVEAL_EFFECTS)[number];

type RevealTag = "div" | "section" | "header" | "footer" | "h2" | "p" | "ul" | "ol";

export type RevealProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  effect: RevealEffect;
  /** Milliseconds to wait after it comes into view. */
  delay?: number;
  /** Milliseconds between direct children; when set, the children animate one after another. */
  stagger?: number;
  /**
   * 2 staggers the children of Reveal's single child instead, for wrapping a list component
   * (like Accordion) whose items live inside its own root element.
   */
  staggerDepth?: 1 | 2;
  /** Render as this element, so Reveal can be the grid or heading instead of wrapping it. */
  as?: RevealTag;
  children: ReactNode;
};

/** How much of the element must be on screen before it animates in. */
const THRESHOLD = 0.15;

/**
 * Animates its children in the first time they scroll into view.
 *
 * The server-rendered HTML is fully visible: nothing is hidden until this has mounted, and
 * then only if it starts below the fold and the visitor hasn't asked for reduced motion.
 * So a failed script, a print, or a reader mode never shows a blank section.
 * Children can be server components; only this wrapper runs in the browser.
 */
export function Reveal({
  effect,
  delay = 0,
  stagger,
  staggerDepth = 1,
  as = "div",
  style,
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  // A callback ref types cleanly against every tag in `as`, which an object ref does not.
  const setRef = useCallback((node: HTMLElement | null) => {
    ref.current = node;
  }, []);
  const Tag = as;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Already on screen (or above it) at load: leave it alone rather than flash it away.
    if (element.getBoundingClientRect().top < window.innerHeight) return;

    if (stagger) {
      const items = staggerDepth === 2 ? element.firstElementChild?.children : element.children;
      Array.from(items ?? []).forEach((child, index) => {
        if (child instanceof HTMLElement) child.style.setProperty("--i", String(index));
      });
    }
    // Set straight on the DOM: React doesn't manage this attribute, so it never re-renders.
    element.dataset.revealState = "hidden";

    let frame = 0;
    const show = () => {
      element.dataset.revealState = "shown";
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) show();
      },
      { threshold: THRESHOLD }
    );
    observer.observe(element);

    // The observer only reports elements that are on screen at some check. A jump straight past
    // one (End key, a #faq link) never makes it "intersect", so this catches anything scrolled past.
    function handleScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (element && element.getBoundingClientRect().bottom < 0) show();
      });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frame);
    };
  }, [stagger, staggerDepth]);

  return (
    <Tag
      {...rest}
      ref={setRef}
      data-reveal={effect}
      data-reveal-stagger={stagger ? (staggerDepth === 2 ? "deep" : "") : undefined}
      style={{
        ...style,
        ...cssVars({ "--reveal-delay": `${delay}ms`, "--reveal-stagger": `${stagger ?? 0}ms` }),
      }}
    >
      {children}
    </Tag>
  );
}
