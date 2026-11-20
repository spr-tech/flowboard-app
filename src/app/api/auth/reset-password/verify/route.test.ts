// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { getResetTokenState } from "@/server/auth/passwordReset.service";
import { POST } from "./route";

// route() imports Auth.js, which only loads inside Next; public routes never call it.
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/auth/passwordReset.service", () => ({ getResetTokenState: vi.fn() }));

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/auth/reset-password/verify", { method: "POST", body: JSON.stringify(body) }),
    { params: Promise.resolve({}) },
  );
}

describe("POST /api/auth/reset-password/verify", () => {
  it.each(["valid", "expired", "used", "invalid"] as const)("answers { state: %s }", async (state) => {
    vi.mocked(getResetTokenState).mockResolvedValue(state);

    const response = await post({ token: "a".repeat(43) });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ state });
  });

  it("answers 400 without a token", async () => {
    const response = await post({});

    expect(response.status).toBe(400);
    expect(getResetTokenState).not.toHaveBeenCalled();
  });
});
