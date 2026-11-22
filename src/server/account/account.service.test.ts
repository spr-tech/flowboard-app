// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { changePassword, getMe, updateMyName } from "./account.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const row = { id: "u1", name: "Ada Okafor", email: "ada@example.com", image: null, passwordHash: "hash" };

beforeEach(() => resetPrismaMock());

describe("getMe", () => {
  it("returns the user without the password hash", async () => {
    prismaMock.user.findUnique.mockResolvedValue(row as never);

    const me = await getMe("u1");

    expect(me).toEqual({ id: "u1", name: "Ada Okafor", email: "ada@example.com", image: null, hasPassword: true });
    expect(me).not.toHaveProperty("passwordHash");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "u1" } }));
  });

  it("says a GitHub-only user has no password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...row, passwordHash: null } as never);

    expect((await getMe("u1")).hasPassword).toBe(false);
  });

  it("throws 401 when the user no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getMe("gone")).rejects.toMatchObject({ status: 401, code: "UNAUTHENTICATED" });
  });
});

describe("updateMyName", () => {
  it("saves the trimmed name and returns me", async () => {
    prismaMock.user.update.mockResolvedValue({ ...row, name: "Ada O." } as never);

    expect(await updateMyName("u1", "  Ada O. ")).toEqual({
      id: "u1",
      name: "Ada O.",
      email: "ada@example.com",
      image: null,
      hasPassword: true,
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: "Ada O." } }));
  });
});

describe("changePassword", () => {
  const NOW = new Date("2026-11-23T12:00:00.000Z");

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    const passwordHash = await bcrypt.hash("old-password-1", 4);
    prismaMock.user.findUnique.mockResolvedValue({ ...row, passwordHash } as never);
    prismaMock.user.update.mockResolvedValue(row as never);
  });

  it("checks the current password, then saves the new hash and passwordChangedAt together", async () => {
    await changePassword("u1", { currentPassword: "old-password-1", password: "plum-harbour-71" });

    const data = prismaMock.user.update.mock.calls[0][0].data as { passwordHash: string; passwordChangedAt: Date };
    expect(data.passwordChangedAt).toEqual(NOW);
    expect(await bcrypt.compare("plum-harbour-71", data.passwordHash)).toBe(true);
    vi.useRealTimers();
  });

  it("refuses a wrong current password on its field", async () => {
    await expect(changePassword("u1", { currentPassword: "nope", password: "plum-harbour-71" })).rejects.toMatchObject({
      status: 400,
      fields: { currentPassword: "That isn't your current password" },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("refuses the same password, a common one, or one with the name or email", async () => {
    const change = (password: string) => changePassword("u1", { currentPassword: "old-password-1", password });

    await expect(change("old-password-1")).rejects.toMatchObject({
      fields: { password: "That's your current password. Choose a new one." },
    });
    await expect(change("basketball")).rejects.toMatchObject({
      fields: { password: "This password is too common. Try a longer or less predictable one." },
    });
    await expect(change("okafor-forever")).rejects.toMatchObject({
      fields: { password: "Don't use your name or email in your password" },
    });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("has nothing to change for a GitHub-only account", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...row, passwordHash: null } as never);

    await expect(changePassword("u1", { currentPassword: "x", password: "plum-harbour-71" })).rejects.toMatchObject({
      status: 400,
      code: "NO_PASSWORD",
    });
    vi.useRealTimers();
  });
});
