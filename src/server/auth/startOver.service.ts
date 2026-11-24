// "Use a different email" on the code page (docs/plan/01-product-and-flows.md): someone who
// signed up with the wrong address starts again. Their unconfirmed account is deleted if it's
// empty, which frees the address straight away for its real owner.
import { Prisma } from "@/lib/generated/prisma";
import type { StartOverResponse } from "@/models/responses/emailVerificationResponses";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";

/**
 * Deletes the signed-in account if it is unconfirmed and empty; the browser then signs out and
 * goes to /register either way.
 * - A confirmed account is never deleted this way (400).
 * - "Empty" means no project memberships. The gate stops unconfirmed users creating anything, so
 *   new accounts are empty; older ones from before the gate may own projects and are kept.
 * - Anything else that points at the user with onDelete: Restrict (invites sent, columns, tasks,
 *   activity, notes) makes the database refuse (P2003): the account is kept, not half-deleted.
 * - Cascades remove the rest with it: linked Google/GitHub accounts, reset links, codes and
 *   memberships (none here). Sessions are cookies: every server check reloads the user, so they
 *   end everywhere. Failed sign-in records are keyed by email, not user, and expire in 15 minutes.
 */
export async function startOver(userId: string): Promise<StartOverResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true, _count: { select: { memberships: true } } },
  });
  if (!user) return { deleted: false };
  if (user.emailVerified) {
    throw new ApiError(400, "ALREADY_VERIFIED", "Your email is already confirmed, so this account stays.");
  }
  if (user._count.memberships > 0) return { deleted: false };

  try {
    // emailVerified: null in the where too, so a confirmation landing in between keeps the account.
    await prisma.user.delete({ where: { id: userId, emailVerified: null } });
    return { deleted: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2003" || error.code === "P2025")) {
      return { deleted: false };
    }
    throw error;
  }
}
