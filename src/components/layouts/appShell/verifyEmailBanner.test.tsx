import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { MeResponse } from "@/models/responses/meResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { BANNER_DISMISSED_KEY, VerifyEmailBanner } from "./verifyEmailBanner";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/projects/p1" }));

const me: MeResponse = {
  id: "u1",
  name: "Ada",
  email: "ada@team.dev",
  image: null,
  hasPassword: true,
  emailVerified: false,
};

function serve(user: MeResponse) {
  return mockFetch((request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/me") return jsonResponse(200, user);
    if (path === "/api/auth/verify-email/send") {
      return jsonResponse(200, { email: user.email, isVerified: false, resendAvailableAt: null, sendsLeftThisHour: 2 });
    }
    return jsonResponse(404, {});
  });
}

beforeEach(() => window.sessionStorage.clear());

describe("VerifyEmailBanner", () => {
  it("asks unverified users to confirm, with Enter code (back to this page) and Resend code", async () => {
    serve(me);
    renderWithStore(<VerifyEmailBanner />);

    expect(await screen.findByText("Confirm your email to invite people.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Enter code" })).toHaveAttribute(
      "href",
      "/verify-email?callbackUrl=%2Fprojects%2Fp1"
    );
    expect(screen.getByRole("button", { name: "Resend code" })).toBeInTheDocument();
  });

  it("isn't there for verified users", async () => {
    const fetchMock = serve({ ...me, emailVerified: true });
    renderWithStore(<VerifyEmailBanner />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByText("Confirm your email to invite people.")).not.toBeInTheDocument();
  });

  it("Resend code sends one and says where it went", async () => {
    serve(me);
    renderWithStore(<VerifyEmailBanner />);

    await userEvent.click(await screen.findByRole("button", { name: "Resend code" }));

    expect(toast).toHaveBeenCalledWith({ type: "success", message: "We sent a new code to ada@team.dev." });
  });

  it("dismissing hides it for this session; it's back on the next visit", async () => {
    serve(me);
    const first = renderWithStore(<VerifyEmailBanner />);

    await userEvent.click(await screen.findByRole("button", { name: "Dismiss for now" }));
    expect(screen.queryByText("Confirm your email to invite people.")).not.toBeInTheDocument();
    expect(window.sessionStorage.getItem(BANNER_DISMISSED_KEY)).toBe("1");
    first.unmount();

    // A reload in the same tab: still dismissed.
    const second = renderWithStore(<VerifyEmailBanner />);
    await vi.waitFor(() => expect(screen.queryByRole("button", { name: "Resend code" })).not.toBeInTheDocument());
    second.unmount();

    // A new visit (the tab's session storage is gone): back again.
    window.sessionStorage.clear();
    renderWithStore(<VerifyEmailBanner />);
    expect(await screen.findByText("Confirm your email to invite people.")).toBeInTheDocument();
  });
});
