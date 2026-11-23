// @vitest-environment node
import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { isSessionStale, register, verifyCredentials } from "./auth.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

beforeEach(() => {
  resetPrismaMock();
});

describe("register", () => {
  it("refuses a common password, or one containing the name or email, and creates nothing", async () => {
    await expect(
      register({ name: "Ada Okafor", email: "ada@example.com", password: "1234567890" })
    ).rejects.toMatchObject({
      status: 400,
      fields: { password: "This password is too common. Try a longer or less predictable one." },
    });
    await expect(
      register({ name: "Ada Okafor", email: "ada@example.com", password: "okafor-is-great" })
    ).rejects.toMatchObject({ fields: { password: "Don't use your name or email in your password" } });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  const input = { name: "  Ada Okafor ", email: " Ada@Example.COM", password: "correct-horse" };

  it("saves a trimmed name, a lowercased email and a bcrypt hash, never the password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: "u1", name: "Ada Okafor", email: "ada@example.com" } as never);

    await expect(register(input)).resolves.toEqual({ id: "u1", name: "Ada Okafor", email: "ada@example.com" });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@example.com" } })
    );
    const { data } = prismaMock.user.create.mock.calls[0][0];
    expect(data).toMatchObject({ name: "Ada Okafor", email: "ada@example.com" });
    expect(data.passwordHash).not.toBe("correct-horse");
    expect(await bcrypt.compare("correct-horse", data.passwordHash!)).toBe(true);
  });

  it("refuses an email that's taken with 409 EMAIL_TAKEN", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "existing" } as never);

    await expect(register(input)).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("turns a same-moment duplicate (unique index, P2002) into 409 too", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(Object.assign(new Error("Unique constraint failed"), { code: "P2002" }));

    await expect(register(input)).rejects.toMatchObject({ status: 409, code: "EMAIL_TAKEN" });
  });

  it("lets other database errors through", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockRejectedValue(new Error("connection lost"));

    await expect(register(input)).rejects.toThrow("connection lost");
  });
});

describe("verifyCredentials", () => {
  // Cost 4 keeps the test fast; verifyCredentials reads the cost from the hash itself.
  const passwordHash = bcrypt.hashSync("correct-horse", 4);
  const user = { id: "u1", name: "Ada", email: "ada@example.com", image: null, passwordHash };

  it("returns the user, without the hash, for the right password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as never);

    await expect(verifyCredentials("ada@example.com", "correct-horse")).resolves.toEqual({
      id: "u1",
      name: "Ada",
      email: "ada@example.com",
      image: null,
    });
  });

  it("looks the email up trimmed and lowercased", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as never);
    await verifyCredentials("  ADA@example.com ", "correct-horse");

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@example.com" } })
    );
  });

  it("returns null for a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(user as never);
    await expect(verifyCredentials("ada@example.com", "wrong")).resolves.toBeNull();
  });

  it("returns null for an unknown email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(verifyCredentials("nobody@example.com", "anything")).resolves.toBeNull();
  });

  it("returns null for a GitHub-only user, who has no password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...user, passwordHash: null } as never);
    await expect(verifyCredentials("ada@example.com", "")).resolves.toBeNull();
  });
});

describe("isSessionStale", () => {
  const changedAt = new Date("2026-11-19T12:00:00Z");

  it("keeps a session when the password has never changed", () => {
    expect(isSessionStale(Date.parse("2026-01-01T00:00:00Z"), null)).toBe(false);
  });

  it("keeps a session that signed in after the password changed", () => {
    expect(isSessionStale(changedAt.getTime() + 1, changedAt)).toBe(false);
  });

  it("ends a session that signed in before the password changed", () => {
    expect(isSessionStale(changedAt.getTime() - 1, changedAt)).toBe(true);
  });

  it("ends a session with no sign-in time once the password has changed", () => {
    expect(isSessionStale(undefined, changedAt)).toBe(true);
  });
});
