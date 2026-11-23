import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  it("says where the code went, with the spam hint, Resend and Do this later", async () => {
    serve(() => jsonResponse(200, me));
    renderWithStore(<VerifyEmailContent />);

    expect(await screen.findByText("ada@team.dev")).toBeInTheDocument();
    expect(screen.getByText(/We sent a 6-digit code to/)).toBeInTheDocument();
    expect(screen.getByText("Can't find it? Check your spam folder.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Do this later" })).toHaveAttribute("href", "/dashboard");
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
