import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import ResetPasswordContent from "./resetPasswordContent";

describe("ResetPasswordContent", () => {
  it("checks the link first, then shows the form for a valid link", async () => {
    mockFetch(() => jsonResponse(200, { state: "valid" }));
    renderWithStore(<ResetPasswordContent token="abc" />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking your link");
    expect(await screen.findByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
  });

  it.each([
    ["used", /already used/i],
    ["expired", /expired/i],
    ["invalid", /doesn.t work/i],
  ])("explains a %s link and offers a new one", async (state, heading) => {
    mockFetch(() => jsonResponse(200, { state }));
    renderWithStore(<ResetPasswordContent token="abc" />);

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ask for a new link" })).toHaveAttribute("href", "/forgot-password");
  });

  it("says when the check couldn't reach the server, and tries again on request", async () => {
    let isOnline = false;
    mockFetch(() => {
      if (!isOnline) throw new TypeError("Failed to fetch");
      return jsonResponse(200, { state: "valid" });
    });
    renderWithStore(<ResetPasswordContent token="abc" />);

    expect(await screen.findByRole("alert")).toHaveTextContent("We couldn't reach Flowboard");

    isOnline = true;
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: /choose a new password/i })).toBeInTheDocument();
  });
});
