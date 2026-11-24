// Accounts and sessions: register, check a password, and decide whether a session is still valid.
import bcrypt from "bcryptjs";

import { assertPasswordAllowed } from "@/server/auth/passwordRules";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { isUniqueViolation } from "@/server/lib/prismaErrors";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

/**
 * bcrypt work factor. 10 is the usual minimum; bcryptjs is pure JavaScript, and 12 took over a
 * second per sign-in. Matches prisma/seed.ts. Must match TIMING_DUMMY_HASH below.
 */
export const BCRYPT_ROUNDS = 10;

/**
 * Compared against when the email has no password, so "no such account" takes as long as
 * "wrong password" and response times don't reveal which emails exist. Not anyone's password.
 */
const TIMING_DUMMY_HASH = "$2b$10$EemiSnI3QTF8J26iiRO2cuLiuJHoEkIKawhdz/4EuRu4r.P6Zft6G";

const emailTaken = () =>
  new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists. Sign in instead.");

export type CreatedUser = { id: string; name: string | null; email: string };

export async function register(input: { name: string; email: string; password: string }): Promise<CreatedUser> {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();

  assertPasswordAllowed(input.password, { email, name });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw emailTaken();

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  try {
    return await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });
  } catch (error) {
    // Two sign-ups with the same email at the same moment: the unique index stops the second.
    if (isUniqueViolation(error)) throw emailTaken();
    throw error;
  }
}

export type SignedInUser = { id: string; name: string | null; email: string; image: string | null };

/** The user if the email and password match, otherwise null. Never says which part was wrong. */
export async function verifyCredentials(emailInput: string, password: string): Promise<SignedInUser | null> {
  const user = await prisma.user.findUnique({
    where: { email: normaliseEmail(emailInput) },
    select: { id: true, name: true, email: true, image: true, passwordHash: true },
  });

  // GitHub-only users have no hash; they get the same answer as a wrong password.
  const isMatch = await bcrypt.compare(password, user?.passwordHash ?? TIMING_DUMMY_HASH);
  if (!user?.passwordHash || !isMatch) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}

/**
 * A session started before the password last changed is no longer valid: that's how a reset
 * signs out every other device. `authTime` is when this session signed in (milliseconds).
 * A token with no authTime predates this check, so it's treated as stale once a password changes.
 */
export function isSessionStale(authTime: number | undefined, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false;
  if (authTime === undefined) return true;
  return authTime < passwordChangedAt.getTime();
}

/** What the session needs from the database on each request. */
export async function getSessionUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, image: true, passwordChangedAt: true, emailVerified: true },
  });
}
