// The signed-in user's own account: who I am, my name, my password (docs/plan/04-api.md, "Account").
// Account changes write no Activity row: Activity belongs to a project, and these belong to none.
import bcrypt from "bcryptjs";

import type { MeResponse } from "@/models/responses/meResponses";
import { BCRYPT_ROUNDS } from "@/server/auth/auth.service";
import { assertPasswordAllowed } from "@/server/auth/passwordRules";
import { ApiError, unauthenticated } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";

const meSelect = { id: true, name: true, email: true, image: true, passwordHash: true } as const;

type UserRow = { id: string; name: string | null; email: string; image: string | null; passwordHash: string | null };

/** The hash is read only to answer "has a password?"; it never leaves this file. */
function toMe(user: UserRow): MeResponse {
  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: passwordHash !== null };
}

export async function getMe(userId: string): Promise<MeResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: meSelect });
  // The session already reloads the user, so this only happens if they vanish mid-request.
  if (!user) throw unauthenticated();
  return toMe(user);
}

export async function updateMyName(userId: string, name: string): Promise<MeResponse> {
  return toMe(await prisma.user.update({ where: { id: userId }, data: { name: name.trim() }, select: meSelect }));
}

/**
 * Email accounts only. Checks the current password, applies the new-password rules against this
 * account, then saves the hash and passwordChangedAt together: every session that signed in before
 * now ends (the session check in sessionToken.ts). The route signs this device in again.
 */
export async function changePassword(
  userId: string,
  input: { currentPassword: string; password: string }
): Promise<MeResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: meSelect });
  if (!user) throw unauthenticated();
  if (!user.passwordHash) {
    throw new ApiError(400, "NO_PASSWORD", "You sign in with GitHub, so there's no Flowboard password to change.");
  }
  if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
    throw new ApiError(400, "VALIDATION_FAILED", "Some fields need fixing.", {
      currentPassword: "That isn't your current password",
    });
  }
  if (input.password === input.currentPassword) {
    throw new ApiError(400, "VALIDATION_FAILED", "Some fields need fixing.", {
      password: "That's your current password. Choose a new one.",
    });
  }
  assertPasswordAllowed(input.password, user);

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  return toMe(
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
      select: meSelect,
    })
  );
}
