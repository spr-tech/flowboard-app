// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestPasswordReset } from "@/server/auth/passwordReset.service";
import { POST } from "./route";

// `after` runs work once the response is sent; here we collect it and run it by hand.
const afterCallbacks: (() => Promise<void>)[] = [];
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  after: (callback: () => Promise<void>) => afterCallbacks.push(callback),
}));
vi.mock("@/server/auth/passwordReset.service", () => ({ requestPasswordReset: vi.fn() }));

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  afterCallbacks.length = 0;
  // clearMocks keeps queued one-off results; reset so none leak between tests.
  vi.mocked(requestPasswordReset).mockReset();
  vi.stubEnv("APP_URL", "https://flowboard.test");
  vi.spyOn(console, "info").mockImplementation(() => undefined);
});

describe("POST /api/auth/forgot-password", () => {
  it("answers exactly the same whatever happens to the email", async () => {
    const answers = [];
    for (const outcome of ["sent", "unknown-email", "rate-limited", "github-only"] as const) {
      vi.mocked(requestPasswordReset).mockResolvedValueOnce(outcome);
      const response = await post({ email: "ada@example.com" });
      answers.push({ status: response.status, body: await response.json() });
      await afterCallbacks.at(-1)!();
    }
    expect(requestPasswordReset).toHaveBeenCalledTimes(4);

    expect(new Set(answers.map((answer) => JSON.stringify(answer))).size).toBe(1);
    expect(answers[0]).toEqual({
      status: 200,
      body: { message: "If an account exists for that email, we've sent a link to reset the password." },
    });
  });

  it("answers before looking the email up, so timing can't reveal anything", async () => {
    await post({ email: "ada@example.com" });

    expect(requestPasswordReset).not.toHaveBeenCalled();
    await afterCallbacks[0]();
    expect(requestPasswordReset).toHaveBeenCalledWith("ada@example.com", "https://flowboard.test");
  });

  it("passes the email on trimmed and lowercased", async () => {
    await post({ email: "  Ada@Example.COM " });
    await afterCallbacks[0]();

    expect(requestPasswordReset).toHaveBeenCalledWith("ada@example.com", "https://flowboard.test");
  });

  it("still answers 200 when sending fails afterwards, and logs the full error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = new Error("SMTP down");
    vi.mocked(requestPasswordReset).mockRejectedValueOnce(failure);

    const response = await post({ email: "ada@example.com" });
    await afterCallbacks[0]();

    expect(response.status).toBe(200);
    expect(console.error).toHaveBeenCalledWith("[forgot-password] FAILED:", failure);
  });

  it("logs the outcome when the deferred work succeeds", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.mocked(requestPasswordReset).mockResolvedValueOnce("sent");

    await post({ email: "ada@example.com" });
    await afterCallbacks[0]();

    expect(console.info).toHaveBeenCalledWith("[forgot-password] finished: sent");
  });

  it("rejects an invalid email with 400 in our error shape", async () => {
    const response = await post({ email: "not-an-email" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "VALIDATION_FAILED",
        message: "Some fields need fixing.",
        fields: { email: "Enter a valid email address" },
      },
    });
    expect(afterCallbacks).toHaveLength(0);
  });
});
