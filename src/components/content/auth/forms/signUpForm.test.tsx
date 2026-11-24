import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signIn } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { SignUpForm } from "./signUpForm";

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

const PASSWORD = "Lagos2024!-plum";
const validInvite = {
  state: "valid",
  email: "ada@team.dev",
  inviterName: "Alex Morgan",
  project: { name: "Website relaunch", colour: "vermilion", description: null },
};

beforeEach(() => {
  router.push.mockReset();
  vi.mocked(signIn).mockResolvedValue({ error: undefined, code: undefined, status: 200, ok: true, url: null });
});

async function typePasswords() {
  await userEvent.type(screen.getByLabelText("Password", { exact: true }), PASSWORD);
  await userEvent.type(screen.getByLabelText("Confirm password"), PASSWORD);
}

describe("SignUpForm password rules", () => {
  it("says 'Passwords can't contain < or >' as soon as one is typed, and takes it away once removed", async () => {
    mockFetch(() => jsonResponse(500, {}));
    renderWithStore(<SignUpForm />);
    const password = screen.getByLabelText("Password", { exact: true });

    await userEvent.type(password, "plum<");
    expect(await screen.findByText("Passwords can't contain < or >")).toBeInTheDocument();
    expect(password).toHaveFocus();

    await userEvent.type(password, "{Backspace}");
    await waitFor(() => expect(screen.queryByText("Passwords can't contain < or >")).not.toBeInTheDocument());
  });

  it("shows the special-character check and the strength meter as the password is typed", async () => {
    mockFetch(() => jsonResponse(500, {}));
    renderWithStore(<SignUpForm />);

    expect(screen.getByText("One special character")).toHaveTextContent("(not yet)");
    await userEvent.type(screen.getByLabelText("Password", { exact: true }), "tea-before-lagos-traffic");

    expect(screen.getByText("One special character")).toHaveTextContent("(done)");
    expect(screen.getByText(/Password strength:/)).toHaveTextContent("Password strength: Strong");
  });
});

describe("SignUpForm after the account is created", () => {
  it("signs in, then goes to /verify-email with where they were going", async () => {
    mockFetch(() => jsonResponse(201, { id: "u1", name: "Ada Okafor", email: "ada@team.dev", needsEmailCode: true }));
    renderWithStore(<SignUpForm callbackUrl="/projects" />);

    await userEvent.type(screen.getByLabelText("Full name"), "Ada Okafor");
    await userEvent.type(screen.getByLabelText("Email"), "ada@team.dev");
    await typePasswords();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/verify-email?callbackUrl=%2Fprojects"));
    expect(signIn).toHaveBeenCalledWith("credentials", expect.objectContaining({ email: "ada@team.dev" }));
  });

  it("from a live invite: sends the token along and skips /verify-email", async () => {
    const bodies: unknown[] = [];
    mockFetch(async (request) => {
      if (new URL(request.url).pathname === "/api/auth/register") {
        bodies.push(await request.json());
        return jsonResponse(201, { id: "u1", name: "Ada Okafor", email: "ada@team.dev", needsEmailCode: false });
      }
      return jsonResponse(200, validInvite);
    });
    renderWithStore(<SignUpForm inviteToken="tok" callbackUrl="/invite/tok" />);
    await vi.waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue("ada@team.dev"));

    await userEvent.type(screen.getByLabelText("Full name"), "Ada Okafor");
    await typePasswords();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/invite/tok"));
    expect(bodies[0]).toMatchObject({ inviteToken: "tok", email: "ada@team.dev" });
  });
});

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

describe("SignUpForm while submitting", () => {
  it("links the Terms and the Privacy Policy under the form", () => {
    mockFetch(() => jsonResponse(500, {}));
    renderWithStore(<SignUpForm />);

    expect(screen.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
  });

  it("locks the fields while creating the account, then unlocks with everything kept when it fails", async () => {
    let answer: (response: Response) => void = () => {};
    mockFetch(() => new Promise<Response>((resolve) => (answer = resolve)));
    renderWithStore(<SignUpForm />);
    await userEvent.type(screen.getByLabelText("Full name"), "Ada Okafor");
    await userEvent.type(screen.getByLabelText("Email"), "ada@team.dev");
    await typePasswords();
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("button", { name: "Creating account…" })).toBeDisabled();
    expect(screen.getByLabelText("Full name")).toBeDisabled();

    answer(
      jsonResponse(409, { error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } })
    );

    expect(await screen.findByText("An account with this email already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeEnabled();
    expect(screen.getByLabelText("Full name")).toHaveValue("Ada Okafor");
    expect(screen.getByLabelText("Password", { exact: true })).toHaveValue(PASSWORD);
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveFocus());
  });
});
