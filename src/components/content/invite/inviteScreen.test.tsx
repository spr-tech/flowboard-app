import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn, signOut } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { InvitePreview } from "@/models/responses/memberResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { InviteScreen } from "./inviteScreen";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

const valid: InvitePreview = {
  state: "valid",
  email: "ada@team.dev",
  inviterName: "Alex Morgan",
  project: { name: "Website relaunch", colour: "vermilion", description: "Before the January launch" },
};

function renderInvite(preview: InvitePreview, signedInEmail: string | null, accept?: () => Response) {
  const fetchMock = mockFetch((request) =>
    request.method === "POST" ? (accept?.() ?? jsonResponse(500, {})) : jsonResponse(200, preview)
  );
  renderWithStore(<InviteScreen token="tok" signedInEmail={signedInEmail} />);
  return fetchMock;
}

beforeEach(() => vi.clearAllMocks());

describe("InviteScreen", () => {
  it("signed out: Google (when set up) and GitHub come back here to join", async () => {
    mockFetch(() => jsonResponse(200, valid));
    vi.mocked(signIn).mockReturnValue(new Promise(() => {}));
    renderWithStore(<InviteScreen token="tok" signedInEmail={null} isGoogleEnabled />);

    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google" }));

    expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/invite/tok" });
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeDisabled();
  });

  it("signed out without Google set up: GitHub only", async () => {
    renderInvite(valid, null);

    expect(await screen.findByRole("button", { name: "Continue with GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
  });

  it("signed out: the project, inviter and description, with Create an account and Sign in coming back here", async () => {
    renderInvite(valid, null);

    expect(await screen.findByRole("heading", { name: "Join Website relaunch" })).toBeInTheDocument();
    expect(screen.getByText(/Alex Morgan invited you to/)).toBeInTheDocument();
    expect(screen.getByText("Before the January launch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/register?invite=tok&callbackUrl=%2Finvite%2Ftok"
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login?callbackUrl=%2Finvite%2Ftok");
  });

  it("signed in as the invited email: Join goes to the board with a toast", async () => {
    const fetchMock = renderInvite(valid, "Ada@Team.dev", () =>
      jsonResponse(200, { projectId: "p1", projectName: "Website relaunch" })
    );

    await userEvent.click(await screen.findByRole("button", { name: "Join Website relaunch" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/projects/p1"));
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "You joined Website relaunch" });
    const write = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "POST");
    expect(new URL(write?.url ?? "").pathname).toBe("/api/invites/token/tok/accept");
  });

  it("signed in as someone else: says whose invite it is (masked) and offers to sign out and come back", async () => {
    renderInvite(valid, "sam@example.com");

    expect(
      await screen.findByText("This invite is for a***@team.dev. You're signed in as sam@example.com.")
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Join/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Sign out and continue" }));
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/invite/tok" });
  });

  it("expired: asks the inviter for a new one", async () => {
    renderInvite({ state: "expired", inviterName: "Alex Morgan", projectName: "Website relaunch" }, null);

    expect(await screen.findByText("This invite has expired. Ask Alex Morgan to send a new one.")).toBeInTheDocument();
  });

  it.each([
    ["used", "This invite was already used"],
    ["cancelled", "This invite was cancelled"],
    ["invalid", "This invite link doesn't work"],
  ] as const)("%s: a clear message and a link to Projects", async (state, heading) => {
    renderInvite({ state }, "ada@team.dev");

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your projects" })).toHaveAttribute("href", "/projects");
  });

  it("if the link died meanwhile (used in another tab), Join shows that instead of an error toast", async () => {
    renderInvite(valid, "ada@team.dev", () =>
      jsonResponse(400, { error: { code: "INVITE_USED", message: "This invite has already been used." } })
    );

    await userEvent.click(await screen.findByRole("button", { name: "Join Website relaunch" }));

    expect(await screen.findByRole("heading", { name: "This invite was already used" })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it("shows the reason inline when joining fails for another reason", async () => {
    renderInvite(valid, "ada@team.dev", () =>
      jsonResponse(500, { error: { code: "INTERNAL_ERROR", message: "Something went wrong on our side." } })
    );

    await userEvent.click(await screen.findByRole("button", { name: "Join Website relaunch" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong on our side.");
    expect(within(document.body).getByRole("button", { name: "Join Website relaunch" })).toBeEnabled();
  });
});
