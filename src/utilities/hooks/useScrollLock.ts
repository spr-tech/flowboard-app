"use client";

// Stops the page scrolling behind a full-screen panel (the landing page's phone menu).
// `overflow: hidden` on <body> alone isn't enough: iOS Safari still scrolls the page under it.
// So the body is pinned with `position: fixed`, shifted up by the current scroll, which keeps the
// page looking exactly where it was; unlocking puts the old styles back and returns to that spot.
import { useEffect } from "react";

const LOCKED_STYLES = ["position", "top", "left", "right", "width", "overflow"] as const;

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { body } = document;
    const scrollY = window.scrollY;
    const saved = LOCKED_STYLES.map((name) => [name, body.style[name]] as const);

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      for (const [name, value] of saved) body.style[name] = value;
      // "instant" so a smooth-scroll setting can't animate the page back into place.
      window.scrollTo({ top: scrollY, left: 0, behavior: "instant" });
    };
  }, [locked]);
}
