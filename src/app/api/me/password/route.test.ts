// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { signIn } from "@/auth";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn(), signIn: vi.fn() }));
vi.mock("@/server/account/account.service", () => ({ changePassword: vi.fn() }));
const { changePassword } = await import("@/server/account/account.service");

const body = { currentPassword: "old-password-1", password: "plum-harbour-71", confirmPassword: "plum-harbour-71" };
const me = { id: "u1", name: "Ada", email: "ada@team.dev", image: null, hasPassword: true };

beforeEach(() => {
  vi.clearAllMocks();
  signInAs("u1");
});

describe("PATCH /api/me/password", () => {
  it("changes the password, then signs this device in again with the new one", async () => {
    vi.mocked(changePassword).mockResolvedValue(me);

    const response = await PATCH(jsonRequest("/api/me/password", "PATCH", body), segment());

    expect(response.status).toBe(200);
    expect(changePassword).toHaveBeenCalledWith("u1", body);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "ada@team.dev",
      password: "plum-harbour-71",
      redirect: false,
    });
  });

  it("doesn't sign in again when the change is refused", async () => {
    vi.mocked(changePassword).mockRejectedValue(
      new ApiError(400, "VALIDATION_FAILED", "Some fields need fixing.", {
        currentPassword: "That isn't your current password",
      })
    );

    const response = await PATCH(jsonRequest("/api/me/password", "PATCH", body), segment());

    expect(response.status).toBe(400);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("checks the new password's rules before calling the service", async () => {
    const response = await PATCH(
      jsonRequest("/api/me/password", "PATCH", { ...body, password: "short", confirmPassword: "short" }),
      segment()
    );

    expect(response.status).toBe(400);
    expect(changePassword).not.toHaveBeenCalled();
  });
});
