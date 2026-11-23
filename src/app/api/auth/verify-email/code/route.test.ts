// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyCode } from "@/server/auth/emailVerification.service";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/emailVerification.service", () => ({ verifyCode: vi.fn() }));

const me = { id: "u1", name: "Ada", email: "ada@example.com", image: null, hasPassword: true, emailVerified: true };
const post = (body: unknown) => POST(jsonRequest("/api/auth/verify-email/code", "POST", body), segment());

beforeEach(() => signInAs("u1"));

describe("POST /api/auth/verify-email/code", () => {
  it("checks the code for the signed-in user and answers with the user, now verified", async () => {
    vi.mocked(verifyCode).mockResolvedValue(me);

    const response = await post({ code: " 123456 " });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(me);
    expect(verifyCode).toHaveBeenCalledWith("u1", "123456");
  });

  it("answers 400 CODE_WRONG with the attempts left, in our error shape", async () => {
    vi.mocked(verifyCode).mockRejectedValue(new ApiError(400, "CODE_WRONG", "Wrong code. 4 attempts left."));

    const response = await post({ code: "000000" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "CODE_WRONG", message: "Wrong code. 4 attempts left." } });
  });

  it.each(["12345", "1234567", "12a456", ""])("rejects %j with the shared schema, before the service", async (code) => {
    const response = await post({ code });

    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({ code: "Enter the 6-digit code" });
    expect(verifyCode).not.toHaveBeenCalled();
  });

  it("needs a session (401)", async () => {
    signInAs(null);

    expect((await post({ code: "123456" })).status).toBe(401);
    expect(verifyCode).not.toHaveBeenCalled();
  });
});
