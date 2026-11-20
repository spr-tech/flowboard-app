// The signed-in user's own account. Renaming and changing the password arrive with settings.
import type { MeResponse } from "@/models/responses/meResponses";
import { unauthenticated } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";

export async function getMe(userId: string): Promise<MeResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, passwordHash: true },
  });
  // The session already reloads the user, so this only happens if they vanish mid-request.
  if (!user) throw unauthenticated();

  // The hash is read only to answer "has a password?"; it never leaves this function.
  const { passwordHash, ...rest } = user;
  return { ...rest, hasPassword: passwordHash !== null };
}
