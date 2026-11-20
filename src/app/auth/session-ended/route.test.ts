// @vitest-environment node
import type { Session } from "next-auth";
import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";

import { auth, signOut } from "@/auth";
import { GET } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn(), signOut: vi.fn() }));
// The real redirect() throws to stop the handler; the mock does the same.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
const mockAuth = auth as unknown as Mock<() => Promise<Session | null>>;

function get(query = "") {
  return GET(new Request(`https://flowboard.test/auth/session-ended${query}`));
}

beforeEach(() => {
  mockAuth.mockReset();
  mockAuth.mockResolvedValue(null);
});

describe("GET /auth/session-ended", () => {
  it("signs out and goes to /login with the reason", async () => {
    await get();

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login?reason=signed-out" });
  });

  it("keeps the page the user was on, so they come back to it after signing in", async () => {
    await get(`?callbackUrl=${encodeURIComponent("/projects/p1?task=t1")}`);

    expect(signOut).toHaveBeenCalledWith({
      redirectTo: "/login?reason=signed-out&callbackUrl=%2Fprojects%2Fp1%3Ftask%3Dt1",
    });
  });

  it("drops a callbackUrl to another site", async () => {
    await get(`?callbackUrl=${encodeURIComponent("https://evil.example/steal")}`);

    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/login?reason=signed-out&callbackUrl=%2Fdashboard" });
  });

  it("sends a still-valid session on to the page (or the dashboard) without signing out", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1", email: "ada@example.com" }, expires: "2099-01-01T00:00:00Z" });

    await expect(get(`?callbackUrl=${encodeURIComponent("/projects")}`)).rejects.toThrow("NEXT_REDIRECT");
    await expect(get()).rejects.toThrow("NEXT_REDIRECT");

    expect(redirect).toHaveBeenNthCalledWith(1, "/projects");
    expect(redirect).toHaveBeenNthCalledWith(2, "/dashboard");
    expect(signOut).not.toHaveBeenCalled();
  });
});
