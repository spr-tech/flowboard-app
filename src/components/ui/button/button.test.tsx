import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./button";

describe("Button", () => {
  it("is enabled and clickable by default", async () => {
    const onClick = vi.fn();
    render(<Button text="Save" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("isLoading disables it, marks it busy and ignores clicks", async () => {
    const onClick = vi.fn();
    render(<Button text="Save" onClick={onClick} isLoading />);
    const button = screen.getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("isLoading swaps the start icon for a spinner", () => {
    render(<Button text="Save" isLoading startIcon={<svg data-testid="start-icon" />} />);

    expect(screen.queryByTestId("start-icon")).not.toBeInTheDocument();
    expect(screen.getByRole("button").querySelector(".animate-spin")).not.toBeNull();
  });

  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button text="Save" />);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });
});
