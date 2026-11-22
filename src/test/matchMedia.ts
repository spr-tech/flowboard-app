// jsdom has no matchMedia. This stands in for it with a pretend screen width, so a test can
// render at phone or desktop width and change width mid-test (listeners hear the change).
// Supports the width queries the app uses: "(width < Nrem)" and "(min-width: Nrem)".
import { act } from "@testing-library/react";
import { vi } from "vitest";

const REM = 16;

function matchesWidth(query: string, width: number) {
  const below = query.match(/\(width < ([\d.]+)rem\)/);
  if (below) return width < Number(below[1]) * REM;
  const atLeast = query.match(/\(min-width: ([\d.]+)rem\)/);
  if (atLeast) return width >= Number(atLeast[1]) * REM;
  return false;
}

/** Call in a test (or beforeEach); undo with vi.unstubAllGlobals(). */
export function stubScreenWidth(initialWidth: number) {
  let width = initialWidth;
  const lists: { query: string; listeners: Set<(event: MediaQueryListEvent) => void>; last: boolean }[] = [];

  vi.stubGlobal("matchMedia", (query: string) => {
    const list = {
      query,
      listeners: new Set<(event: MediaQueryListEvent) => void>(),
      last: matchesWidth(query, width),
    };
    lists.push(list);
    return {
      media: query,
      get matches() {
        return matchesWidth(query, width);
      },
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => list.listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
        list.listeners.delete(listener),
    };
  });

  return {
    /** Resize: every query whose answer changes tells its listeners. */
    setWidth(next: number) {
      width = next;
      act(() => {
        for (const list of lists) {
          const matches = matchesWidth(list.query, width);
          if (matches === list.last) continue;
          list.last = matches;
          list.listeners.forEach((listener) => listener({ matches, media: list.query } as MediaQueryListEvent));
        }
      });
    },
  };
}

export const PHONE_WIDTH = 390;
export const DESKTOP_WIDTH = 1440;
