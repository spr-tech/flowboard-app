// Every interactive transaction goes through here, so they all share one set of limits.
//
// Prisma's defaults (wait 2s for a connection, finish within 5s) are tight for this app: a cold
// Neon start can take a few seconds on its own, and each statement inside a transaction is one
// Lagos-to-Frankfurt round trip. A normal invite once failed with a 500 after about 6 seconds.
//
// Rules for what goes inside (see docs/plan/04-api.md):
// - only the writes that must happen together (and the Activity row that records them);
//   permission checks and other reads go before it, on the plain client
// - never await email (sendEmail) or any other network call inside: commit first, then send
import type { Prisma } from "@/lib/generated/prisma";
import { prisma } from "@/server/lib/prisma";

export const TRANSACTION_OPTIONS = {
  /** How long to wait for a free connection before giving up. */
  maxWait: 10_000,
  /** How long the whole transaction may run before Prisma rolls it back. */
  timeout: 15_000,
} as const;

/** prisma.$transaction(fn) with TRANSACTION_OPTIONS. */
export function transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, TRANSACTION_OPTIONS);
}
