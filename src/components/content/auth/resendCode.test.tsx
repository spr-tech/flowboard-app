import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { VerificationStatusResponse } from "@/models/responses/emailVerificationResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { ResendCode } from "./resendCode";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const NOW = new Date("2026-11-23T12:00:00.000Z");
const inSeconds = (seconds: number) => new Date(NOW.getTime() + seconds * 1000).toISOString();
const status = (overrides: Partial<VerificationStatusResponse> = {}): VerificationStatusResponse => ({
  email: "ada@team.dev",
  isVerified: false,
  resendAvailableAt: null,
  sendsLeftThisHour: 2,
  ...overrides,
});

beforeEach(() => {
  // Only the clock and the countdown's timers are fake; promises and fetch run normally.
  vi.useFakeTimers({ now: NOW, toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"] });
});
afterEach(() => vi.useRealTimers());

describe("ResendCode", () => {
  it("counts down the 60 seconds after a send, then lets them resend", () => {
    renderWithStore(<ResendCode status={status({ resendAvailableAt: inSeconds(60) })} onSent={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Resend code in 60s" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(18_000));
    expect(screen.getByRole("button", { name: "Resend code in 42s" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(42_000));
    expect(screen.getByRole("button", { name: "Resend code" })).toBeEnabled();
  });

  it("after 3 codes in an hour, says how long until the next one", () => {
    renderWithStore(
      <ResendCode
        status={status({ resendAvailableAt: inSeconds(19 * 60 + 5), sendsLeftThisHour: 0 })}
        onSent={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Resend code" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "You've asked for 3 codes in the last hour. You can ask again in 20 minutes."
    );
  });

  it("sends a new code, toasts where it went, and tells the page to start over", async () => {
    vi.useRealTimers();
    const fetchMock = mockFetch(() => jsonResponse(200, status({ resendAvailableAt: inSeconds(60) })));
    const onSent = vi.fn();
    renderWithStore(<ResendCode status={status()} onSent={onSent} />);

    await userEvent.click(screen.getByRole("button", { name: "Resend code" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(new URL(request.url).pathname).toBe("/api/auth/verify-email/send");
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "We sent a new code to ada@team.dev." });
    expect(onSent).toHaveBeenCalledOnce();
  });
});
