import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/renderWithStore";
import SignInContent, { SIGN_IN_ERROR_MESSAGES } from "./signInContent";
import SignUpContent from "./signUpContent";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => vi.unstubAllEnvs());

describe("Continue with Google", () => {
  it("is hidden where Google sign-in isn't set up (no AUTH_GOOGLE_ID), so previews show no broken button", () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "");
    renderWithStore(<SignInContent />);

    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
  });

  it("shows above GitHub on sign in and sign up when it is set up", () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "123.apps.googleusercontent.com");
    for (const page of [<SignInContent key="in" />, <SignUpContent key="up" />]) {
      const { unmount } = renderWithStore(page);
      const [first, second] = screen.getAllByRole("button", { name: /^Continue with/ });

      expect(first).toHaveAccessibleName("Continue with Google");
      expect(second).toHaveAccessibleName("Continue with GitHub");
      unmount();
    }
  });

  it("clicking it spins only Google and disables GitHub and the form", async () => {
    vi.stubEnv("AUTH_GOOGLE_ID", "123.apps.googleusercontent.com");
    vi.mocked(signIn).mockReturnValue(new Promise(() => {})); // navigating away to Google
    renderWithStore(<SignInContent callbackUrl="/projects/p1" />);

    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));

    expect(screen.getByRole("button", { name: "Opening Google…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/projects/p1" });
  });
});

describe("sign-in errors", () => {
  it.each(Object.entries(SIGN_IN_ERROR_MESSAGES))("explains %s", (code, message) => {
    renderWithStore(<SignInContent error={code} />);
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it("keeps GitHub's 'sign in the way you did before' message for an email that already has an account", () => {
    renderWithStore(<SignInContent error="OAuthAccountNotLinked" />);
    expect(screen.getByText(/already has a Flowboard account/)).toBeInTheDocument();
  });

  it("falls back to a general message for anything else", () => {
    renderWithStore(<SignInContent error="Callback" />);
    expect(screen.getByText("Signing in didn't work. Please try again.")).toBeInTheDocument();
  });
});
