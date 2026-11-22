// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { SIGN_IN_WINDOW_MS, TooManySignInAttempts, signInWithPassword } from "./signInLimit.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/auth/auth.service", () => ({ verifyCredentials: vi.fn() }));
// next-auth's entry point loads Next's server runtime, which a plain Node test doesn't have; only
// its CredentialsSignin error class is used here.
vi.mock("next-auth", () => ({
  CredentialsSignin: class CredentialsSignin extends Error {
    code = "credentials";
  },
}));
const { verifyCredentials } = await import("@/server/auth/auth.service");

const NOW = new Date("2026-11-23T12:00:00.000Z");
const ada = { id: "ada", name: "Ada", email: "ada@team.dev", image: null };

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  prismaMock.signInAttempt.count.mockResolvedValue(0);
});
afterEach(() => vi.useRealTimers());

describe("signInWithPassword", () => {
  it("counts this email's failures in the last 15 minutes, by its lowercased address", async () => {
    vi.mocked(verifyCredentials).mockResolvedValue(ada);

    await signInWithPassword("  Ada@Team.dev ", "right");

    expect(prismaMock.signInAttempt.count).toHaveBeenCalledWith({
      where: { email: "ada@team.dev", createdAt: { gte: new Date(NOW.getTime() - SIGN_IN_WINDOW_MS) } },
    });
  });

  it("records a failure for a wrong password, and for an unknown email alike", async () => {
    vi.mocked(verifyCredentials).mockResolvedValue(null);

    expect(await signInWithPassword("ada@team.dev", "wrong")).toBeNull();
    expect(await signInWithPassword("nobody@team.dev", "anything")).toBeNull();

    expect(prismaMock.signInAttempt.create.mock.calls.map(([args]) => args.data.email)).toEqual([
      "ada@team.dev",
      "nobody@team.dev",
    ]);
  });

  it("refuses the 6th attempt after 5 failures, before checking the password, for any email", async () => {
    prismaMock.signInAttempt.count.mockResolvedValue(5);

    await expect(signInWithPassword("ada@team.dev", "right")).rejects.toBeInstanceOf(TooManySignInAttempts);
    await expect(signInWithPassword("nobody@team.dev", "x")).rejects.toMatchObject({ code: "rate_limited" });
    expect(verifyCredentials).not.toHaveBeenCalled();
    expect(prismaMock.signInAttempt.create).not.toHaveBeenCalled();
  });

  it("lets the 5th attempt through (4 failures so far)", async () => {
    prismaMock.signInAttempt.count.mockResolvedValue(4);
    vi.mocked(verifyCredentials).mockResolvedValue(ada);

    expect(await signInWithPassword("ada@team.dev", "right")).toEqual(ada);
  });

  it("a successful sign-in clears the email's failures", async () => {
    vi.mocked(verifyCredentials).mockResolvedValue(ada);

    await signInWithPassword("ada@team.dev", "right");

    expect(prismaMock.signInAttempt.deleteMany).toHaveBeenCalledWith({ where: { email: "ada@team.dev" } });
  });

  it("tidies away the email's rows that have left the window when recording a failure", async () => {
    vi.mocked(verifyCredentials).mockResolvedValue(null);

    await signInWithPassword("ada@team.dev", "wrong");

    expect(prismaMock.signInAttempt.deleteMany).toHaveBeenCalledWith({
      where: { email: "ada@team.dev", createdAt: { lt: new Date(NOW.getTime() - SIGN_IN_WINDOW_MS) } },
    });
  });
});
