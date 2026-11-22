import { act, cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/renderWithStore";
import { LandingNav } from "./landingNav";

const MD_UP = "(min-width: 48rem)";

/** The "change" listeners registered on the md query, so a test can widen the screen. */
let mdListeners: ((event: MediaQueryListEvent) => void)[] = [];
let isMdUp = false;

beforeEach(() => {
  mdListeners = [];
  isMdUp = false;
  // jsdom has no matchMedia, no layout and no scrolling.
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      get matches() {
        return query === MD_UP && isMdUp;
      },
      media: query,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        if (query === MD_UP) mdListeners.push(listener);
      },
      removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        mdListeners = mdListeners.filter((item) => item !== listener);
      },
    }))
  );
  vi.spyOn(window, "scrollY", "get").mockReturnValue(2400);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup(); // Unmount (and unlock the page) while the mocks are still in place.
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.removeAttribute("style");
  window.history.replaceState(null, "", "/");
});

function widenToMd() {
  isMdUp = true;
  act(() => mdListeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent)));
}

function renderNav() {
  const result = renderWithStore(
    <>
      <LandingNav />
      <section id="faq">FAQ section</section>
    </>
  );
  const button = screen.getByRole("button", { name: "Open menu" });
  const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
  if (!panel) throw new Error("aria-controls doesn't point at the panel");
  return { ...result, button, panel };
}

describe("LandingNav (phone menu)", () => {
  it("starts closed, with the button pointing at the hidden panel and the page free to scroll", () => {
    const { button, panel } = renderNav();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
    expect(document.body.style.position).toBe("");
  });

  it("opens with focus on the first section link: four sections, then Create a free board above Sign in", async () => {
    const { button, panel } = renderNav();

    await userEvent.click(button);

    expect(panel).toBeVisible();
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button).toHaveAccessibleName("Close menu");
    const sections = within(panel).getByRole("navigation", { name: "Sections" });
    expect(
      within(sections)
        .getAllByRole("link")
        .map((link) => link.textContent)
    ).toEqual(["How it works", "Features", "Why Flowboard", "FAQ"]);
    expect(within(sections).getByRole("link", { name: "How it works" })).toHaveFocus();
    expect(
      within(panel)
        .getAllByRole("link")
        .slice(4)
        .map((link) => [link.textContent, link.getAttribute("href")])
    ).toEqual([
      ["Create a free board", "/register"],
      ["Sign in", "/login"],
    ]);
  });

  it("locks the page while open and puts it back exactly where it was on close", async () => {
    const { button } = renderNav();

    await userEvent.click(button);
    expect(document.body.style.position).toBe("fixed");
    expect(document.body.style.top).toBe("-2400px");

    await userEvent.click(button);
    expect(document.body.style.position).toBe("");
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 2400, left: 0, behavior: "instant" });
  });

  it("closes on Escape and puts focus back on the button", async () => {
    const { button, panel } = renderNav();
    await userEvent.click(button);

    await userEvent.keyboard("{Escape}");

    expect(panel).not.toBeVisible();
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Open menu");
  });

  it("closes on the X and when Create a free board is tapped", async () => {
    const { button, panel } = renderNav();

    await userEvent.click(button);
    await userEvent.click(button);
    expect(panel).not.toBeVisible();

    await userEvent.click(button);
    await userEvent.click(within(panel).getByRole("link", { name: "Create a free board" }));
    expect(panel).not.toBeVisible();
  });

  it("a section link closes the menu, unlocks the page, then scrolls to that section", async () => {
    const { button, panel } = renderNav();
    await userEvent.click(button);

    await userEvent.click(within(panel).getByRole("link", { name: "FAQ" }));

    expect(panel).not.toBeVisible();
    expect(document.body.style.position).toBe("");
    const faq = screen.getByText("FAQ section");
    expect(faq.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
    // The page is put back first, then the section is scrolled to, so the scroll isn't undone.
    const restoreOrder = vi.mocked(window.scrollTo).mock.invocationCallOrder[0];
    expect(restoreOrder).toBeLessThan(vi.mocked(faq.scrollIntoView).mock.invocationCallOrder[0]);
    expect(window.location.hash).toBe("#faq");
  });

  it("keeps focus inside: Tab wraps from the last item to the X, Shift+Tab from the X to the last item", async () => {
    const { button, panel } = renderNav();
    await userEvent.click(button);
    const signIn = within(panel).getByRole("link", { name: "Sign in" });

    signIn.focus();
    await userEvent.tab();
    expect(button).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(signIn).toHaveFocus();

    // Every Tab stop while open is the X or inside the panel.
    for (let step = 0; step < 8; step++) {
      await userEvent.tab();
      const focused = document.activeElement;
      expect(focused === button || panel.contains(focused)).toBe(true);
    }
  });

  it("closes when the screen widens to md and unlocks the page", async () => {
    const { button, panel } = renderNav();
    await userEvent.click(button);

    widenToMd();

    expect(panel).not.toBeVisible();
    expect(document.body.style.position).toBe("");
    // The menu button is hidden from md up, so focus goes to the logo instead.
    expect(screen.getByRole("link", { name: "Flowboard" })).toHaveFocus();
  });
});
