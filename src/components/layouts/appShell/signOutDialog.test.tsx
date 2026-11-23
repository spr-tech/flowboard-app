import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOut } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SettingsContent from "@/components/content/settings/settingsContent";
import type { MeResponse } from "@/models/responses/meResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { SignOutDialog } from "./signOutDialog";
import { UserMenu } from "./userMenu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }) }));

const ada: MeResponse = { id: "u1", name: "Ada Okafor", email: "ada@team.dev", image: null, hasPassword: true };

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch(() => jsonResponse(200, ada));
});

async function openFromUserMenu() {
  renderWithStore(
    <>
      <UserMenu user={{ name: ada.name ?? "", email: ada.email }} />
      <SignOutDialog />
    </>
  );
  await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
  return screen.findByRole("dialog", { name: "Sign out of Flowboard?" });
}

describe("Sign out confirmation", () => {
  it("opens from the user menu, with focus on Cancel, without signing out", async () => {
    const dialog = await openFromUserMenu();

    expect(within(dialog).getByText("You'll need to sign in again on this device.")).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus());
    expect(signOut).not.toHaveBeenCalled();
  });

  it("opens from Account settings → Session", async () => {
    renderWithStore(
      <>
        <SettingsContent />
        <SignOutDialog />
      </>
    );
    const session = await screen.findByRole("region", { name: "Session" });
    await userEvent.click(within(session).getByRole("button", { name: "Sign out" }));

    expect(await screen.findByRole("dialog", { name: "Sign out of Flowboard?" })).toBeInTheDocument();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("Cancel and Escape close it and keep me signed in", async () => {
    let dialog = await openFromUserMenu();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    dialog = await screen.findByRole("dialog", { name: "Sign out of Flowboard?" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(signOut).not.toHaveBeenCalled();
  });

  it("Sign out shows a loading button and signs out to /login", async () => {
    vi.mocked(signOut).mockReturnValue(new Promise(() => undefined)); // the page navigates away instead
    const dialog = await openFromUserMenu();

    const confirm = within(dialog).getByRole("button", { name: "Sign out" });
    await userEvent.click(confirm);

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login" });
    expect(confirm).toBeDisabled();
    expect(confirm).toHaveAttribute("aria-busy", "true");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
