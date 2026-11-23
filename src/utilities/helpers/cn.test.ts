import { describe, expect, it } from "vitest";

import { cn } from "./cn";

const DISPLAY_SIZES = [
  "text-display-hero",
  "text-display-statement",
  "text-display-section",
  "text-display-why",
  "text-display-why-phone",
  "text-display-cta",
  "text-display-faq",
];

describe("cn", () => {
  // Stock tailwind-merge reads text-display-* as a colour and drops it when a colour follows.
  it.each(DISPLAY_SIZES)("keeps %s when a colour class comes after it", (size) => {
    expect(cn(size, "text-fg-primary")).toBe(`${size} text-fg-primary`);
  });

  it("still lets a later display size replace an earlier one", () => {
    expect(cn("text-display-hero", "text-display-cta")).toBe("text-display-cta");
  });

  it("still resolves ordinary conflicts, last one wins", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
    expect(cn("text-fg-primary", "text-fg-secondary")).toBe("text-fg-secondary");
  });

  it("drops falsy values", () => {
    const isActive = false;
    expect(cn("base", isActive && "active", undefined, null)).toBe("base");
  });
});
