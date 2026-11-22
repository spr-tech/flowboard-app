import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonScreen } from "./skeleton";

describe("Skeleton", () => {
  it("is a shimmering block hidden from screen readers, sized by the caller", () => {
    const { container } = render(<Skeleton className="h-4 w-32" />);
    const block = container.firstElementChild;

    expect(block).toHaveAttribute("aria-hidden", "true");
    expect(block).toHaveClass("skeleton", "h-4", "w-32");
    expect(block).not.toHaveClass("skeleton-on-sunken");
  });

  it("uses the card tone on sunken surfaces", () => {
    const { container } = render(<Skeleton tone="card" />);

    expect(container.firstElementChild).toHaveClass("skeleton", "skeleton-on-sunken");
  });
});

describe("SkeletonScreen", () => {
  it("is busy and says what is loading, while its shapes stay hidden", () => {
    render(
      <SkeletonScreen label="Loading the board" data-testid="screen">
        <Skeleton />
      </SkeletonScreen>
    );

    expect(screen.getByTestId("screen")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Loading the board");
    expect(screen.getByRole("status")).toHaveClass("sr-only");
  });
});
