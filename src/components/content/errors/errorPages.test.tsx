import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ErrorContent from "./errorContent";
import NotFoundContent from "./notFoundContent";

describe("NotFoundContent", () => {
  it("sends signed-in people to their projects", () => {
    render(<NotFoundContent isSignedIn />);
    expect(screen.getByRole("heading", { level: 1, name: "We couldn't find that page" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your projects" })).toHaveAttribute("href", "/projects");
  });

  it("sends signed-out visitors home", () => {
    render(<NotFoundContent isSignedIn={false} />);
    expect(screen.getByRole("link", { name: "Go to the home page" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("link", { name: "Go to your projects" })).not.toBeInTheDocument();
  });

  it("links the logo home", () => {
    render(<NotFoundContent isSignedIn={false} />);
    expect(screen.getByRole("link", { name: "Flowboard" })).toHaveAttribute("href", "/");
  });
});

describe("ErrorContent", () => {
  it("retries and offers a way out", async () => {
    const onRetry = vi.fn();
    render(<ErrorContent onRetry={onRetry} link={{ href: "/projects", text: "Go to your projects" }} />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "Go to your projects" })).toHaveAttribute("href", "/projects");
  });

  it("shows the logo only as a full page", () => {
    const link = { href: "/", text: "Go to the home page" };
    const { unmount } = render(<ErrorContent onRetry={() => undefined} link={link} />);
    expect(screen.queryByRole("link", { name: "Flowboard" })).not.toBeInTheDocument();
    unmount();

    render(<ErrorContent onRetry={() => undefined} link={link} isFullPage />);
    expect(screen.getByRole("link", { name: "Flowboard" })).toBeInTheDocument();
  });
});
