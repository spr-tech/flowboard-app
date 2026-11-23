import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { MeResponse } from "@/models/responses/meResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { InviteForm } from "./inviteForm";

vi.mock("next/navigation", () => ({ usePathname: () => "/projects/p1/settings" }));

const me: MeResponse = {
  id: "u1",
  name: "Ada",
  email: "ada@team.dev",
  image: null,
  hasPassword: true,
  emailVerified: false,
};

describe("InviteForm", () => {
  it.each(["dark", "light"] as const)(
    "(%s) shows unverified owners the reason and Enter code instead of the form",
    async (tone) => {
      mockFetch(() => jsonResponse(200, me));
      renderWithStore(<InviteForm projectId="p1" tone={tone} />);

      expect(await screen.findByText("Confirm your email before inviting people.")).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Enter code" })).toHaveAttribute(
        "href",
        "/verify-email?callbackUrl=%2Fprojects%2Fp1%2Fsettings"
      );
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Send invite" })).not.toBeInTheDocument();
    }
  );

  it("shows the form to verified owners", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { ...me, emailVerified: true }));
    renderWithStore(<InviteForm projectId="p1" tone="light" />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByLabelText("Invite by email")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send invite" })).toBeInTheDocument();
    expect(screen.queryByText("Confirm your email before inviting people.")).not.toBeInTheDocument();
  });
});
