import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { SignUpForm } from "./signUpForm";

describe("SignUpForm from an invite link", () => {
  it("fills in the invited email and locks it", async () => {
    mockFetch(() =>
      jsonResponse(200, {
        state: "valid",
        email: "ada@team.dev",
        inviterName: "Alex Morgan",
        project: { name: "Website relaunch", colour: "vermilion", description: null },
      })
    );
    renderWithStore(<SignUpForm inviteToken="tok" callbackUrl="/invite/tok" />);

    const email = screen.getByLabelText("Email");
    await vi.waitFor(() => expect(email).toHaveValue("ada@team.dev"));
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByText("This is the address your invite was sent to.")).toBeInTheDocument();
  });

  it("leaves the email free when the invite isn't live", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { state: "used" }));
    renderWithStore(<SignUpForm inviteToken="tok" />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("readonly");
  });

  it("asks nothing without an invite", () => {
    const fetchMock = mockFetch(() => jsonResponse(500, {}));
    renderWithStore(<SignUpForm />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });
});
