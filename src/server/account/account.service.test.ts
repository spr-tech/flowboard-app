// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { getMe } from "./account.service";

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
