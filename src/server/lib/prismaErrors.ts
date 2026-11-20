/**
 * True when Prisma refused a write because a unique index already has that value (code P2002),
 * e.g. two sign-ups with the same email at the same moment. Checks the code rather than the error
 * class, which doesn't narrow reliably across Prisma's generated-client builds.
 */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
