import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PasswordStrengthMeter } from "./passwordStrengthMeter";

/** The live region: the only part screen readers hear (the bar is hidden from them). */
const liveRegion = (container: HTMLElement) => container.querySelector("[aria-live]") as HTMLElement;

describe("PasswordStrengthMeter", () => {
  it("says nothing until something is typed, but the polite live region is already there", () => {
    const { container } = render(<PasswordStrengthMeter password="" />);

    expect(liveRegion(container)).toHaveAttribute("aria-live", "polite");
    expect(liveRegion(container)).toBeEmptyDOMElement();
  });

  it.each([
    ["password1!", "Weak", 1],
    ["Kitchen@2024", "Fair", 2],
    ["tea-before-lagos-traffic", "Strong", 3],
  ])("%j: shows the word %s and fills %i of 3 segments", (password, label, filled) => {
    const { container } = render(<PasswordStrengthMeter password={password} />);

    expect(liveRegion(container)).toHaveTextContent(`Password strength: ${label}`);
    expect(screen.getByText(label)).toBeInTheDocument();
    const segments = container.querySelectorAll("[aria-hidden] > span");
    expect(segments).toHaveLength(3);
    expect([...segments].filter((segment) => !segment.className.includes("bg-line-subtle"))).toHaveLength(filled);
  });

  it("updates the announced word as the password changes", () => {
    const { container, rerender } = render(<PasswordStrengthMeter password="password1!" />);
    expect(liveRegion(container)).toHaveTextContent("Weak");

    rerender(<PasswordStrengthMeter password="tea-before-lagos-traffic" />);
    expect(liveRegion(container)).toHaveTextContent("Strong");
  });

  it("says Weak when the password contains the person's name", () => {
    const { container } = render(
      <PasswordStrengthMeter password="tea-before-okafor-traffic" who={{ name: "Ada Okafor" }} />
    );

    expect(liveRegion(container)).toHaveTextContent("Password strength: Weak");
  });
});
