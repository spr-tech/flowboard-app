import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubScreenWidth } from "@/test/matchMedia";
import { WHY_CARDS } from "./whyCards";
import { WhyPhoneDeck } from "./whyPhoneDeck";

/** Phone width, with or without prefers-reduced-motion. */
function stubPhone({ reduced }: { reduced: boolean }) {
  const screenWidth = stubScreenWidth(390);
  const widthMatchMedia = window.matchMedia;
  vi.stubGlobal("matchMedia", (query: string) =>
    query === "(prefers-reduced-motion: reduce)"
      ? { matches: reduced, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }
      : widthMatchMedia(query)
  );
  return screenWidth;
}

const deckRoot = () =>
  screen.getByRole("list", { name: "What your team gets" }).closest(".group\\/deck") as HTMLElement;

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("WhyPhoneDeck", () => {
  it("is a normal list of the six cards, in order, each with its one-line description", () => {
    stubPhone({ reduced: false });
    render(<WhyPhoneDeck />);

    const items = within(screen.getByRole("list", { name: "What your team gets" })).getAllByRole("listitem");
    expect(items.map((item) => item.textContent)).toEqual(
      WHY_CARDS.map((card) => `${card.label}${card.name}${card.description}`)
    );
    expect(screen.getByText("Late tasks turn red so nothing slips.")).toBeInTheDocument();
  });

  it("switches to the scroll-dealt stack after mount when motion is allowed", () => {
    stubPhone({ reduced: false });
    // jsdom has no layout: put the track just below the screen, as it is at the top of the page.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      top: window.innerHeight + 200,
      height: 3 * window.innerHeight,
    } as DOMRect);
    render(<WhyPhoneDeck />);

    expect(deckRoot()).toHaveAttribute("data-mode", "stack");
    // Nothing dealt at the top of the page: every card waits, invisible, below.
    for (const item of screen.getAllByRole("listitem")) expect(item.style.opacity).toBe("0");
  });

  it("stays a plain list with prefers-reduced-motion", () => {
    stubPhone({ reduced: true });
    render(<WhyPhoneDeck />);

    expect(deckRoot()).not.toHaveAttribute("data-mode");
    for (const item of screen.getAllByRole("listitem")) expect(item).not.toHaveAttribute("style");
  });

  it("goes back to a plain list from md up, and stacks again on a phone", () => {
    const screenWidth = stubPhone({ reduced: false });
    render(<WhyPhoneDeck />);

    screenWidth.setWidth(1024);
    expect(deckRoot()).not.toHaveAttribute("data-mode");
    screenWidth.setWidth(390);
    expect(deckRoot()).toHaveAttribute("data-mode", "stack");
  });
});
