// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getVerificationStatus, sendVerificationCode } from "@/server/auth/emailVerification.service";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { GET } from "../status/route";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/emailVerification.service", () => ({
  sendVerificationCode: vi.fn(),
  getVerificationStatus: vi.fn(),
}));

const status = {
  email: "ada@example.com",
  isVerified: false,
  resendAvailableAt: "2026-11-23T12:01:00.000Z",
  sendsLeftThisHour: 2,
};

beforeEach(() => signInAs("u1"));

describe("POST /api/auth/verify-email/send", () => {
  const post = () => POST(jsonRequest("/api/auth/verify-email/send", "POST"), segment());

  it("sends a code to the signed-in user and answers with the new status", async () => {
    vi.mocked(sendVerificationCode).mockResolvedValue(status);

    const response = await post();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(status);
    expect(sendVerificationCode).toHaveBeenCalledWith("u1");
  });

  it("passes the rate limits on as 429", async () => {
    vi.mocked(sendVerificationCode).mockRejectedValue(
      new ApiError(429, "SEND_TOO_SOON", "Wait 40 seconds before asking for another code.")
    );

    const response = await post();

    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe("SEND_TOO_SOON");
  });

  it("needs a session (401)", async () => {
    signInAs(null);

    expect((await post()).status).toBe(401);
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });
});

describe("GET /api/auth/verify-email/status", () => {
  it("answers with the signed-in user's status", async () => {
    vi.mocked(getVerificationStatus).mockResolvedValue(status);

    const response = await GET(jsonRequest("/api/auth/verify-email/status", "GET"), segment());

    expect(await response.json()).toEqual(status);
    expect(getVerificationStatus).toHaveBeenCalledWith("u1");
  });
});
