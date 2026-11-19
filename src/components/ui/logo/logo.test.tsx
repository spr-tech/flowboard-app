import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Logo, type LogoProps } from "./logo";

const VARIANTS: NonNullable<LogoProps["variant"]>[] = ["onLight", "onDark", "onPrimary"];

describe("Logo", () => {
  it.each(VARIANTS)("renders the mark and the name on %s", (variant) => {
    const { container } = render(<Logo variant={variant} />);

    // The tile plus three bars.
    expect(container.querySelectorAll("svg rect")).toHaveLength(4);
    expect(screen.getByText("Flowboard")).toBeVisible();
    expect(screen.getByText("Flowboard")).not.toHaveClass("sr-only");
  });

  it("gives each variant its own colours", () => {
    const tiles = VARIANTS.map((variant) => {
      const { container, unmount } = render(<Logo variant={variant} />);
      const tileAndBars = Array.from(container.querySelectorAll("svg rect"), (rect) => rect.getAttribute("class"));
      unmount();
      return tileAndBars.join(" ");
    });

    expect(new Set(tiles).size).toBe(VARIANTS.length);
  });

  it("hides the svg from screen readers, which read the name instead", () => {
    const { container } = render(<Logo />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden");
  });

  it("isMarkOnly hides the name visually but keeps it for screen readers", () => {
    render(<Logo isMarkOnly />);
    expect(screen.getByText("Flowboard")).toHaveClass("sr-only");
  });
});
