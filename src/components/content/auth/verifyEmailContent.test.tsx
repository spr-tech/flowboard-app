import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signIn, signOut } from "next-auth/react";

import { toast } from "@/components/ui/toast/toast";
import type { VerificationStatusResponse } from "@/models/responses/emailVerificationResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import VerifyEmailContent from "./verifyEmailContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, usePathname: () => "/verify-email" }));

const status: VerificationStatusResponse = {
  email: "ada@team.dev",
  isVerified: false,
  resendAvailableAt: null,
  sendsLeftThisHour: 2,
};
const me = { id: "u1", name: "Ada", email: "ada@team.dev", image: null, hasPassword: true, emailVerified: true };

/** The verify page's requests: the status, and a code check answered by `answerCode`. */
function serve(answerCode: (code: string) => Response) {
  const codes: string[] = [];
  mockFetch(async (request) => {
    const path = new URL(request.url).pathname;
    if (path === "/api/auth/verify-email/status") return jsonResponse(200, status);
    if (path === "/api/auth/verify-email/code") {
      const { code } = (await request.json()) as { code: string };
      codes.push(code);
      return answerCode(code);
    }
    return jsonResponse(404, {});
  });
  return codes;
}

const boxes = () => screen.getAllByRole("textbox", { name: /Digit/ });

beforeEach(() => {
  router.push.mockReset();
  router.refresh.mockReset();
});

describe("VerifyEmailContent", () => {
  it("says where the code went, with the spam hint, Resend, and the ways out that need no code", async () => {
    serve(() => jsonResponse(200, me));
    renderWithStore(<VerifyEmailContent />);

    expect(await screen.findByText("ada@team.dev")).toBeInTheDocument();
    expect(screen.getByText(/We sent a 6-digit code to/)).toBeInTheDocument();
    expect(screen.getByText("Can't find it? Check your spam folder.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    // The verification gate: no "Do this later" any more.
    expect(screen.queryByRole("link", { name: "Do this later" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Use a different email" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    // Google isn't set up in this render.
    expect(screen.queryByRole("button", { name: "Continue with Google instead" })).not.toBeInTheDocument();
    expect(boxes()).toHaveLength(6);
  });

  it("submits by itself on the sixth digit; a wrong code says how many tries are left and clears the boxes", async () => {
    let left = 4;
    const sent = serve(() =>
      jsonResponse(400, { error: { code: "CODE_WRONG", message: `Wrong code. ${left--} attempts left.` } })
    );
    renderWithStore(<VerifyEmailContent />);
    await screen.findByText("ada@team.dev");

    await userEvent.click(boxes()[0]);
    await userEvent.keyboard("111111");
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong code. 4 attempts left.");
    for (const box of boxes()) expect(box).toHaveValue("");

    await userEvent.click(boxes()[0]);
    await userEvent.keyboard("222222");
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Wrong code. 3 attempts left."));
    expect(sent).toEqual(["111111", "222222"]);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("shows the expired and too-many-attempts messages from the server", async () => {
    serve(() =>
      jsonResponse(400, { error: { code: "TOO_MANY_ATTEMPTS", message: "Too many attempts. Send a new code." } })
    );
    renderWithStore(<VerifyEmailContent />);
    await screen.findByText("ada@team.dev");

    await userEvent.click(boxes()[0]);
    await userEvent.paste("123456");

    expect(await screen.findByRole("alert")).toHaveTextContent("Too many attempts. Send a new code.");
  });

  it("on the right code: toasts 'Email confirmed' and goes back where they came from", async () => {
    serve(() => jsonResponse(200, me));
    renderWithStore(<VerifyEmailContent callbackUrl="/projects/p1/settings" />);
    await screen.findByText("ada@team.dev");

    await userEvent.click(boxes()[0]);
    await userEvent.paste("123456");

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/projects/p1/settings"));
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "Email confirmed" });
  });

  it("goes to the dashboard when there's nowhere safe to go back to", async () => {
    serve(() => jsonResponse(200, me));
    renderWithStore(<VerifyEmailContent callbackUrl="https://evil.example/" />);
    await screen.findByText("ada@team.dev");

    await userEvent.click(boxes()[0]);
    await userEvent.paste("123456");

    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/dashboard"));
  });
});

describe("VerifyEmailContent: the ways out", () => {
  /** Answers the status (with `overrides`) and records every other request's path. */
  function serveAll(overrides: Partial<VerificationStatusResponse> = {}) {
    const posted: string[] = [];
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      if (request.method === "GET") return jsonResponse(200, { ...status, ...overrides });
      posted.push(path);
      if (path.endsWith("/send")) return jsonResponse(200, { ...status, sendsLeftThisHour: 2 });
      if (path.endsWith("/start-over")) return jsonResponse(200, { deleted: true });
      return jsonResponse(404, {});
    });
    return posted;
  }

  it("sends a code by itself, once, when none was sent in the last hour", async () => {
    const posted = serveAll({ sendsLeftThisHour: 3 });
    renderWithStore(<VerifyEmailContent />);

    await waitFor(() => expect(posted).toEqual(["/api/auth/verify-email/send"]));
  });

  it("doesn't send another when a code went out recently", async () => {
    const posted = serveAll({ sendsLeftThisHour: 2 });
    renderWithStore(<VerifyEmailContent />);
    await screen.findByText("ada@team.dev");

    expect(posted).toEqual([]);
  });

  it("'Use a different email' asks first, then removes the account and signs out to sign-up", async () => {
    const posted = serveAll();
    renderWithStore(<VerifyEmailContent />);

    await userEvent.click(await screen.findByRole("button", { name: "Use a different email" }));
    expect(screen.getByText(/This removes the account for/)).toBeInTheDocument();
    expect(posted).toEqual([]);

    await userEvent.click(screen.getByRole("button", { name: "Yes, start again" }));

    await waitFor(() => expect(signOut).toHaveBeenCalledWith({ redirectTo: "/register" }));
    expect(posted).toEqual(["/api/auth/verify-email/start-over"]);
  });

  it("'Continue with Google instead' signs out first, then starts Google", async () => {
    serveAll();
    vi.mocked(signOut).mockResolvedValue(undefined as never);
    renderWithStore(<VerifyEmailContent isGoogleEnabled callbackUrl="/projects/p1" />);

    await userEvent.click(await screen.findByRole("button", { name: "Continue with Google instead" }));

    await waitFor(() => expect(signIn).toHaveBeenCalledWith("google", { redirectTo: "/projects/p1" }));
    expect(signOut).toHaveBeenCalledWith({ redirect: false });
    expect(vi.mocked(signOut).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(signIn).mock.invocationCallOrder[0]);
  });
});
