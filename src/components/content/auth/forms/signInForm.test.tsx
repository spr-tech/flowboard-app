import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithStore } from "@/test/renderWithStore";
import { GithubButton } from "../githubButton";
import { SignInProgressProvider } from "../signInProgress";
import { SignInForm } from "./signInForm";

type SignInResult = Awaited<ReturnType<typeof signIn>>;

async function signInWith(result: { error?: string; code?: string }) {
  vi.mocked(signIn).mockResolvedValue({ ok: false, status: 401, url: null, ...result } as never);
  renderWithStore(<SignInForm />);
  await userEvent.type(screen.getByLabelText("Email"), "ada@team.dev");
  await userEvent.type(screen.getByLabelText("Password", { exact: true }), "wrong-password");
  await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
}

/** A sign-in that stays in flight until the test calls finish(). */
function holdSignIn() {
  let finish: (result: SignInResult) => void = () => {};
  vi.mocked(signIn).mockImplementation(() => new Promise<SignInResult>((resolve) => (finish = resolve)));
  return (result: Partial<NonNullable<SignInResult>>) =>
    finish({ ok: false, status: 401, url: null, error: undefined, code: undefined, ...result });
}

function renderPage() {
  renderWithStore(
    <SignInProgressProvider>
      <GithubButton />
      <SignInForm />
    </SignInProgressProvider>
  );
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

  it("locks the fields and both buttons while signing in, and sends only once", async () => {
    const finish = holdSignIn();
    renderPage();
    await userEvent.type(screen.getByLabelText("Email"), "ada@team.dev");
    await userEvent.type(screen.getByLabelText("Password", { exact: true }), "wrong-password{Enter}");

    const submit = await screen.findByRole("button", { name: "Signing in…" });
    expect(submit).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Password", { exact: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();

    await userEvent.click(submit);
    expect(signIn).toHaveBeenCalledTimes(1);
    finish({ error: "CredentialsSignin", code: "credentials" });
    await screen.findByRole("alert");
  });

  it("after a failed sign-in, unlocks, keeps the email, and clears and focuses the password", async () => {
    await signInWith({ error: "CredentialsSignin", code: "credentials" });
    await screen.findByRole("alert");

    const password = screen.getByLabelText("Password", { exact: true });
    expect(screen.getByLabelText("Email")).toBeEnabled();
    expect(screen.getByLabelText("Email")).toHaveValue("ada@team.dev");
    expect(password).toHaveValue("");
    await waitFor(() => expect(password).toHaveFocus());
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("clicking GitHub shows its own spinner and locks the form", async () => {
    vi.mocked(signIn).mockReturnValue(new Promise(() => {})); // navigating away to GitHub
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Continue with GitHub" }));

    expect(screen.getByRole("button", { name: "Opening GitHub…" })).toBeDisabled();
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(signIn).toHaveBeenCalledWith("github", expect.anything());
  });
});
