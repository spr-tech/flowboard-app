// globals.css hides an element only while it has data-reveal-state="hidden". So "visible" in
// these tests means: no element carries that state.
import { act, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Reveal } from "./reveal";

/** The callbacks of every IntersectionObserver created, so a test can say "it's on screen now". */
let observerCallbacks: IntersectionObserverCallback[] = [];

function stubBrowser({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  // jsdom has neither of these.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: prefersReducedMotion && query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback) {
        observerCallbacks.push(callback);
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
      takeRecords = () => [];
    },
  );
}

/** Where every element sits relative to the viewport (jsdom's window is 768px tall). */
function placeElementsAt(top: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top + 300,
    left: 0,
    right: 0,
    width: 0,
    height: 300,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
}

function fireIntersection(isIntersecting: boolean) {
  act(() => {
    for (const callback of observerCallbacks) {
      callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver);
    }
  });
}

const BELOW_THE_FOLD = 2000;

function renderList() {
  return render(
    <Reveal effect="rise" stagger={80} data-testid="reveal">
      <p>First</p>
      <p>Second</p>
    </Reveal>,
  );
}

beforeEach(() => {
  observerCallbacks = [];
});

describe("Reveal", () => {
  it("renders its content visible in the server HTML, before any JavaScript runs", () => {
    const html = renderToString(
      <Reveal effect="rise">
        <p>Server-rendered content</p>
      </Reveal>,
    );

    expect(html).toContain("Server-rendered content");
    expect(html).toContain('data-reveal="rise"');
    expect(html).not.toContain("data-reveal-state");
  });

  it("leaves content that is already on screen at load alone", () => {
    stubBrowser({ prefersReducedMotion: false });
    placeElementsAt(100);
    renderList();

    expect(screen.getByTestId("reveal")).not.toHaveAttribute("data-reveal-state");
  });

  it("hides content below the fold after mount, then shows it when it scrolls into view", () => {
    stubBrowser({ prefersReducedMotion: false });
    placeElementsAt(BELOW_THE_FOLD);
    renderList();
    const reveal = screen.getByTestId("reveal");

    expect(reveal).toHaveAttribute("data-reveal-state", "hidden");

    fireIntersection(true);
    expect(reveal).toHaveAttribute("data-reveal-state", "shown");
  });

  it("numbers staggered children so they animate one after another", () => {
    stubBrowser({ prefersReducedMotion: false });
    placeElementsAt(BELOW_THE_FOLD);
    renderList();

    expect(screen.getByText("First").style.getPropertyValue("--i")).toBe("0");
    expect(screen.getByText("Second").style.getPropertyValue("--i")).toBe("1");
  });

  it("shows content that was jumped past without ever intersecting", () => {
    vi.useFakeTimers();
    stubBrowser({ prefersReducedMotion: false });
    placeElementsAt(BELOW_THE_FOLD);
    renderList();
    const reveal = screen.getByTestId("reveal");
    expect(reveal).toHaveAttribute("data-reveal-state", "hidden");

    // An End-key jump: the element is now entirely above the viewport.
    placeElementsAt(-1000);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      vi.advanceTimersToNextFrame();
    });

    expect(reveal).toHaveAttribute("data-reveal-state", "shown");
  });

  it("with prefers-reduced-motion, shows everything at once, even below the fold", () => {
    stubBrowser({ prefersReducedMotion: true });
    placeElementsAt(BELOW_THE_FOLD);
    renderList();
    const reveal = screen.getByTestId("reveal");

    expect(reveal).not.toHaveAttribute("data-reveal-state");
    expect(screen.getByText("First")).toBeVisible();
    expect(screen.getByText("Second")).toBeVisible();
    // Nothing is waiting to be revealed.
    expect(observerCallbacks).toHaveLength(0);
  });
});
