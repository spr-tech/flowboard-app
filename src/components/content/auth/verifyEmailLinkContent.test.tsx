import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import VerifyEmailLinkContent from "./verifyEmailLinkContent";

const confirmButton = () => screen.getByRole("button", { name: "Confirm my email" });

describe("VerifyEmailLinkContent", () => {
  it("does nothing until the button is clicked, so email scanners can't use the link up", () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { email: "ada@team.dev" }));
    renderWithStore(<VerifyEmailLinkContent token="tok" />);

    expect(confirmButton()).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("confirms with a POST of the token when clicked", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { email: "ada@team.dev" }));
    renderWithStore(<VerifyEmailLinkContent token="tok" />);

    await userEvent.click(confirmButton());

    expect(await screen.findByRole("heading", { name: "Email confirmed" })).toBeInTheDocument();
    expect(screen.getByText("ada@team.dev is all set. You can invite people now.")).toBeInTheDocument();
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/api/auth/verify-email/link");
    expect(await request.json()).toEqual({ token: "tok" });
  });

  it.each([
    ["TOKEN_EXPIRED", "This link has expired"],
    ["TOKEN_USED", "This link was already used"],
    ["TOKEN_INVALID", "This link doesn't work"],
  ])("%s: says so, with a way to get a new code", async (code, heading) => {
    mockFetch(() => jsonResponse(400, { error: { code, message: "x" } }));
    renderWithStore(<VerifyEmailLinkContent token="tok" />);

    await userEvent.click(confirmButton());

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Send a new code" })).toHaveAttribute("href", "/verify-email");
  });

  it("keeps the button when the server can't be reached, so they can try again", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderWithStore(<VerifyEmailLinkContent token="tok" />);

    await userEvent.click(confirmButton());

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });
});
