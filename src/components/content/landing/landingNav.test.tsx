import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithStore } from "@/test/renderWithStore";
import { LandingNav } from "./landingNav";

function renderNav() {
  const result = renderWithStore(
    <>
      <LandingNav />
      <p>Outside the menu</p>
    </>
  );
  const button = screen.getByRole("button", { name: "Open menu" });
  const panel = document.getElementById(button.getAttribute("aria-controls") ?? "");
  if (!panel) throw new Error("aria-controls doesn't point at the panel");
  return { ...result, button, panel };
}

describe("LandingNav (phone menu)", () => {
  it("starts closed, with the button pointing at the hidden panel", () => {
    const { button, panel } = renderNav();

    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(panel).not.toBeVisible();
  });

  it("opens with focus on the first section link, and the button says Close menu", async () => {
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
    expect(within(panel).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(within(panel).getByRole("link", { name: "Create a free board" })).toHaveAttribute("href", "/register");
  });

  it("closes on Escape and puts focus back on the button", async () => {
    const { button, panel } = renderNav();
    await userEvent.click(button);

    await userEvent.keyboard("{Escape}");

    expect(panel).not.toBeVisible();
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName("Open menu");
  });

  it("closes on the X, when a link is tapped, and on a tap outside", async () => {
    const { button, panel } = renderNav();

    await userEvent.click(button);
    await userEvent.click(button);
    expect(panel).not.toBeVisible();

    await userEvent.click(button);
    await userEvent.click(within(panel).getByRole("link", { name: "Features" }));
    expect(panel).not.toBeVisible();

    await userEvent.click(button);
    await userEvent.click(screen.getByText("Outside the menu"));
    expect(panel).not.toBeVisible();
  });
});
