import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { MeResponse } from "@/models/responses/meResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import SettingsContent from "./settingsContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));

const ada: MeResponse = { id: "u1", name: "Ada Okafor", email: "ada@team.dev", image: null, hasPassword: true, emailVerified: true };

function renderSettings(me: MeResponse, onWrite: (request: Request) => Response = () => jsonResponse(200, me)) {
  const fetchMock = mockFetch((request) => (request.method === "GET" ? jsonResponse(200, me) : onWrite(request)));
  const { store } = renderWithStore(<SettingsContent />);
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  return { writes, store };
}

const section = (name: string) => screen.getByRole("region", { name });

beforeEach(() => vi.clearAllMocks());

describe("Account settings: Profile", () => {
  it("enables Save only when the name changed, then saves it", async () => {
    const { writes } = renderSettings(ada, () => jsonResponse(200, { ...ada, name: "Ada O." }));
    const name = await screen.findByLabelText("Full name");
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(
      screen.getByText("Your email is used for sign-in and invites, so it can't be changed here.")
    ).toBeInTheDocument();

    await userEvent.clear(name);
    await userEvent.type(name, "Ada O.");
    expect(save).toBeEnabled();
    await userEvent.click(save);

    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith({ type: "success", message: "Name updated" }));
    expect(await writes()[0].json()).toEqual({ name: "Ada O." });
    expect(new URL(writes()[0].url).pathname).toBe("/api/me");
    expect(refresh).toHaveBeenCalled();
  });
});

describe("Account settings: Password", () => {
  async function fill(current: string, next: string, confirm = next) {
    await userEvent.type(await screen.findByLabelText("Current password"), current);
    await userEvent.type(screen.getByLabelText("New password"), next);
    await userEvent.type(screen.getByLabelText("Confirm new password"), confirm);
  }

  it("shows the live checks and changes the password", async () => {
    const { writes } = renderSettings(ada);
    await fill("old-password-1", "plum-harbour-71");

    const checks = within(section("Password")).getByRole("list");
    expect(checks).toHaveTextContent("At least 10 characters(done)");
    expect(checks).toHaveTextContent("Passwords match(done)");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    await vi.waitFor(() =>
      expect(toast).toHaveBeenCalledWith({
        type: "success",
        message: "Password updated. Your other devices are signed out.",
      })
    );
    expect(new URL(writes()[0].url).pathname).toBe("/api/me/password");
    expect(await writes()[0].json()).toEqual({
      currentPassword: "old-password-1",
      password: "plum-harbour-71",
      confirmPassword: "plum-harbour-71",
    });
    expect(screen.getByLabelText("New password")).toHaveValue("");
  });

  it("stops a password with my name before sending it", async () => {
    const { writes } = renderSettings(ada);
    await fill("old-password-1", "okafor-forever");

    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Don't use your name or email in your password")).toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it("shows the server's answer under the field: a wrong current password, a common one", async () => {
    let answer = { currentPassword: "That isn't your current password" } as Record<string, string>;
    renderSettings(ada, () =>
      jsonResponse(400, { error: { code: "VALIDATION_FAILED", message: "Some fields need fixing.", fields: answer } })
    );
    await fill("wrong-one", "plum-harbour-71");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(await screen.findByText("That isn't your current password")).toBeInTheDocument();

    answer = { password: "This password is too common. Try a longer or less predictable one." };
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));
    expect(
      await screen.findByText("This password is too common. Try a longer or less predictable one.")
    ).toBeInTheDocument();
    expect(toast).not.toHaveBeenCalled();
  });

  it("GitHub-only accounts see 'You sign in with GitHub' instead of the form", async () => {
    renderSettings({ ...ada, hasPassword: false });

    expect(await screen.findByText("You sign in with GitHub")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.getByText("Signed in with GitHub")).toBeInTheDocument();
  });
});

describe("Account settings: Session", () => {
  it("says how I signed in, and Sign out asks first (the dialog itself: signOutDialog.test.tsx)", async () => {
    const { store } = renderSettings(ada);

    expect(await screen.findByText("Signed in with email and password")).toBeInTheDocument();
    await userEvent.click(within(section("Session")).getByRole("button", { name: "Sign out" }));

    expect(store.getState().ui.openDialog).toEqual({ kind: "signOut" });
    expect(signOut).not.toHaveBeenCalled();
  });
});
