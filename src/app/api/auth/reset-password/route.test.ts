// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { resetPassword } from "@/server/auth/passwordReset.service";
import { ApiError } from "@/server/lib/errors";
import { POST } from "./route";

// route() imports Auth.js, which only loads inside Next; public routes never call it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/passwordReset.service", () => ({ resetPassword: vi.fn() }));

const TOKEN = "a".repeat(43);

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/reset-password", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );
}

describe("POST /api/auth/reset-password", () => {
  it("sets the new password and answers 200 with the account", async () => {
    vi.mocked(resetPassword).mockResolvedValue({ email: "ada@example.com" });

    const response = await post({ token: TOKEN, password: "new-password-1", confirmPassword: "new-password-1" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ email: "ada@example.com" });
    expect(resetPassword).toHaveBeenCalledWith(TOKEN, "new-password-1");
  });

  it("passes the service's token errors through in our error shape", async () => {
    vi.mocked(resetPassword).mockRejectedValue(new ApiError(400, "TOKEN_USED", "This reset link was already used."));

    const response = await post({ token: TOKEN, password: "new-password-1", confirmPassword: "new-password-1" });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: { code: "TOKEN_USED", message: "This reset link was already used." } });
  });

  it("validates with the shared schema before touching the token", async () => {
    const response = await post({ token: TOKEN, password: "short", confirmPassword: "other" });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_FAILED");
    expect(resetPassword).not.toHaveBeenCalled();
  });
});
