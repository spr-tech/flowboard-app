import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/renderWithStore";
import { SignInForm } from "./signInForm";

async function signInWith(result: { error?: string; code?: string }) {
  vi.mocked(signIn).mockResolvedValue({ ok: false, status: 401, url: null, ...result } as never);
  renderWithStore(<SignInForm />);
  await userEvent.type(screen.getByLabelText("Email"), "ada@team.dev");
  await userEvent.type(screen.getByLabelText("Password", { exact: true }), "wrong-password");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("says 'Invalid email or password' for a wrong password or unknown email", async () => {
    await signInWith({ error: "CredentialsSignin", code: "credentials" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
  });

  it("says 'Too many attempts' once the server has blocked the email", async () => {
    await signInWith({ error: "CredentialsSignin", code: "rate_limited" });

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Try again in a few minutes.");
  });
});
