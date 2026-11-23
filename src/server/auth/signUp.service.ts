// Sign-up as a whole (docs/plan/01-product-and-flows.md, "Sign up"): create the account, then send
// the confirm-your-email code. Kept apart from auth.service.ts so account creation doesn't depend
// on email verification.
import type { RegisterResponse } from "@/models/responses/authResponses";
import { register } from "@/server/auth/auth.service";
import { sendVerificationCode } from "@/server/auth/emailVerification.service";
import { prisma } from "@/server/lib/prisma";
import { hashToken } from "@/server/lib/secureToken";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

/** Is this a pending, unexpired invite for exactly this email? */
async function isLiveInviteFor(token: string, email: string): Promise<boolean> {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { email: true, expiresAt: true, acceptedAt: true, cancelledAt: true },
  });
  return Boolean(
    invite &&
    invite.email === normaliseEmail(email) &&
    !invite.acceptedAt &&
    !invite.cancelledAt &&
    invite.expiresAt.getTime() > Date.now()
  );
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  inviteToken?: string;
}): Promise<RegisterResponse> {
  const user = await register(input);

  // Signing up from a live invite for this address: accepting it confirms the email, so no code.
  if (input.inviteToken && (await isLiveInviteFor(input.inviteToken, user.email))) {
    return { ...user, needsEmailCode: false };
  }

  try {
    await sendVerificationCode(user.id);
  } catch (error) {
    // The account exists either way; /verify-email can send another code. Never fail the sign-up.
    console.error("Sign-up: the verification code wasn't sent", error);
  }
  return { ...user, needsEmailCode: true };
}
