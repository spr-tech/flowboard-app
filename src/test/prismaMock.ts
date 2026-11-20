// A typed, in-memory stand-in for the Prisma client. In a test file:
//
//   vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
//   import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
//
// Every model method is a vi.fn() you can program with .mockResolvedValue(). Nothing touches a database.
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";

import type { PrismaClient } from "@/lib/generated/prisma";

export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

/** The module shape of "@/server/lib/prisma", for vi.mock. */
export function prismaModule() {
  return { prisma: prismaMock };
}

/**
 * Clears programmed answers between tests, then makes $transaction behave like the real one:
 * an array of queries resolves them all; a callback runs with the same mock as `tx`.
 */
export function resetPrismaMock() {
  mockReset(prismaMock);
  prismaMock.$transaction.mockImplementation(((arg: unknown) =>
    typeof arg === "function" ? arg(prismaMock) : Promise.all(arg as Promise<unknown>[])) as never);
}
