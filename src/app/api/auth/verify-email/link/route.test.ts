// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { verifyLink } from "@/server/auth/emailVerification.service";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment } from "@/test/routeTestHelpers";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/emailVerification.service", () => ({ verifyLink: vi.fn() }));

const post = (body: unknown) => POST(jsonRequest("/api/auth/verify-email/link", "POST", body), segment());

describe("POST /api/auth/verify-email/link", () => {
  it("is public: confirms with the token alone, without reading a session", async () => {
    vi.mocked(verifyLink).mockResolvedValue({ email: "ada@example.com" });

    const response = await post({ token: "abc" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "ada@example.com" });
    expect(verifyLink).toHaveBeenCalledWith("abc");
    expect(auth).not.toHaveBeenCalled();
  });

  it.each(["TOKEN_EXPIRED", "TOKEN_USED", "TOKEN_INVALID"])("passes %s on as a 400", async (code) => {
    vi.mocked(verifyLink).mockRejectedValue(new ApiError(400, code, "That link doesn't work."));

    const response = await post({ token: "abc" });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe(code);
  });

  it("needs a token", async () => {
    expect((await post({})).status).toBe(400);
    expect(verifyLink).not.toHaveBeenCalled();
  });
});
