// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { updateSessionToken } from "./sessionToken";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const SIGNED_IN_AT = new Date("2026-11-19T09:00:00Z");
const dbUser = {
  id: "u1",
  name: "Ada Okafor",
  email: "ada@example.com",
  image: null,
  passwordChangedAt: null,
  emailVerified: null as Date | null,
};

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: SIGNED_IN_AT });
});

describe("updateSessionToken", () => {
  it("at sign-in, stores the user id and the sign-in time", async () => {
    const token = await updateSessionToken({ email: "ada@example.com" }, "u1");

    expect(token).toEqual({ email: "ada@example.com", id: "u1", authTime: SIGNED_IN_AT.getTime() });
    // No database read is needed at sign-in.
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("at sign-in, also records how the session signed in", async () => {
    await expect(updateSessionToken({}, "u1", "google")).resolves.toMatchObject({ signInMethod: "google" });
    await expect(updateSessionToken({}, "u1", "credentials")).resolves.toMatchObject({ signInMethod: "password" });
    await expect(updateSessionToken({}, "u1", "github")).resolves.toMatchObject({ signInMethod: "github" });
  });

  it("refreshes whether the email is verified on every reload", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser as never);
    await expect(updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime() })).resolves.toMatchObject({
      emailVerified: false,
    });

    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, emailVerified: SIGNED_IN_AT } as never);
    await expect(updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime() })).resolves.toMatchObject({
      emailVerified: true,
    });
  });

  it("keeps a session whose password hasn't changed, refreshing name, email and picture", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, name: "Ada O." } as never);

    const token = await updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime(), name: "Ada Okafor" });

    expect(token).toMatchObject({ id: "u1", name: "Ada O.", email: "ada@example.com", picture: null });
  });

  it("ends a session that signed in before the password was reset (signs out other devices)", async () => {
    const resetLater = new Date(SIGNED_IN_AT.getTime() + 60_000);
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, passwordChangedAt: resetLater } as never);

    await expect(updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime() })).resolves.toBeNull();
  });

  it("keeps a session that signed in after the reset", async () => {
    const resetEarlier = new Date(SIGNED_IN_AT.getTime() - 60_000);
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, passwordChangedAt: resetEarlier } as never);

    await expect(updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime() })).resolves.not.toBeNull();
  });

  it("ends the session when the user no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(updateSessionToken({ id: "u1", authTime: SIGNED_IN_AT.getTime() })).resolves.toBeNull();
  });

  it("ends a token with no user id", async () => {
    await expect(updateSessionToken({})).resolves.toBeNull();
  });
});
