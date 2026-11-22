"use client";

// For the few things CSS breakpoints can't do (which way dnd-kit sorts, what a screen reader
// hears). Layout itself always uses Tailwind's md: classes.
import { useSyncExternalStore } from "react";

/** Tailwind's md breakpoint, flipped: true on phones. */
export const PHONE_QUERY = "(width < 48rem)";

const canMatch = () => typeof window !== "undefined" && typeof window.matchMedia === "function";

export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      if (!canMatch()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => (canMatch() ? window.matchMedia(query).matches : false),
    // On the server, and wherever matchMedia doesn't exist: the desktop layout.
    () => false
  );
}

/** Under md. False on the server, so the first render matches the desktop layout. */
export const useIsPhone = () => useMediaQuery(PHONE_QUERY);
