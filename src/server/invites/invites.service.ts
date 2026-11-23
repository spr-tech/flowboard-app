// Invites (docs/plan/04-api.md, "Members and invites"; 01-product-and-flows.md, "Accept invite").
// - Owner only. One pending invite per email per project: inviting again resends it.
// - Tokens: 32 random bytes, only the SHA-256 hash stored, 7 days.
// - The row is written first, then the email is sent; a failed send is reported, and the invite
//   stays listed so Resend works.
// - Transactions hold only the writes (the invite and its Activity row). Checks and the email's
//   details are read before, and the email goes out after the commit (src/server/lib/transaction.ts).
import type {
  AcceptInviteResponse,
  CancelInviteResponse,
  InvitePreview,
  InviteResponse,
  SentInviteResponse,
} from "@/models/responses/memberResponses";
import { inviteEmail } from "@/server/invites/inviteEmail";
import { appUrl } from "@/server/lib/appUrl";
import { sendEmail } from "@/server/lib/email";
import { ApiError } from "@/server/lib/errors";
import { prisma } from "@/server/lib/prisma";
import { transaction } from "@/server/lib/transaction";
import { createToken, hashToken } from "@/server/lib/secureToken";
import { requireOwner, type Db } from "@/server/projects/projectAccess";
import { ActivityAction } from "@/utilities/enums/activityActions";
import { normaliseEmail } from "@/utilities/helpers/normaliseEmail";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const inviteNotFound = () => new ApiError(404, "INVITE_NOT_FOUND", "We couldn't find that invite.");
const notPending = () => new ApiError(400, "INVITE_NOT_PENDING", "That invite has already been used or cancelled.");

const inviteSelect = { id: true, email: true, expiresAt: true } as const;

/** "Sent" is when the current link went out: its expiry minus the 7 days it lasts. */
function toInviteResponse(invite: { id: string; email: string; expiresAt: Date }): InviteResponse {
  return {
    id: invite.id,
    email: invite.email,
    sentAt: new Date(invite.expiresAt.getTime() - INVITE_TTL_MS).toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
  };
}

const displayName = (user: { name: string | null; email: string }) => user.name?.trim() || user.email;

/** What the email needs: the project and who's inviting. */
async function emailDetails(db: Db, projectId: string, inviterId: string) {
  const [project, inviter] = await Promise.all([
    db.project.findUniqueOrThrow({ where: { id: projectId }, select: { name: true, description: true } }),
    db.user.findUniqueOrThrow({ where: { id: inviterId }, select: { name: true, email: true } }),
  ]);
  return { project, inviterName: displayName(inviter) };
}

async function sendInvite(
  to: string,
  token: string,
  { project, inviterName }: Awaited<ReturnType<typeof emailDetails>>
) {
  try {
    await sendEmail(
      inviteEmail({
        to,
        inviterName,
        projectName: project.name,
        description: project.description,
        joinUrl: `${appUrl()}/invite/${token}`,
      })
    );
  } catch {
    // sendEmail has logged the details.
    throw new ApiError(502, "EMAIL_NOT_SENT", "We couldn't send the invite email. Try Resend in a moment.");
  }
}

/** Invite an email, or resend the pending invite it already has. */
export async function createInvite(userId: string, projectId: string, emailInput: string): Promise<SentInviteResponse> {
  const email = normaliseEmail(emailInput);
  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await requireOwner(prisma, userId, projectId);
  const [member, pending, details] = await Promise.all([
    prisma.projectMember.findFirst({
      where: { projectId, user: { email } },
      select: { user: { select: { name: true, email: true } } },
    }),
    prisma.invite.findFirst({
      where: { projectId, email, acceptedAt: null, cancelledAt: null },
      orderBy: { expiresAt: "desc" },
      select: { id: true },
    }),
    emailDetails(prisma, projectId, userId),
  ]);
  if (member) {
    const message = `${displayName(member.user)} is already a member.`;
    throw new ApiError(409, "ALREADY_MEMBER", message, { email: message });
  }

  const invite = await transaction(async (tx) => {
    const saved = pending
      ? await tx.invite.update({
          where: { id: pending.id },
          data: { tokenHash, expiresAt, invitedById: userId },
          select: inviteSelect,
        })
      : await tx.invite.create({
          data: { projectId, email, tokenHash, expiresAt, invitedById: userId },
          select: inviteSelect,
        });
    await tx.activity.create({
      data: {
        projectId,
        actorId: userId,
        action: ActivityAction.MemberInvited,
        meta: pending ? { email, resent: true } : { email },
      },
    });
    return saved;
  });

  // Committed: now the email (never inside the transaction, where a slow send would hold it open).
  await sendInvite(email, token, details);
  return { ...toInviteResponse(invite), resent: Boolean(pending) };
}

/** The project's pending invites, newest first. Expired ones are included; the page marks them. */
export async function listInvites(userId: string, projectId: string): Promise<InviteResponse[]> {
  await requireOwner(prisma, userId, projectId);
  const invites = await prisma.invite.findMany({
    where: { projectId, acceptedAt: null, cancelledAt: null },
    orderBy: { expiresAt: "desc" },
    select: inviteSelect,
  });
  return invites.map(toInviteResponse);
}

/** The invite and its project, if the user owns that project (404 otherwise, like the project). */
async function requirePendingInviteAsOwner(db: Db, userId: string, inviteId: string) {
  const invite = await db.invite.findUnique({
    where: { id: inviteId },
    select: { ...inviteSelect, projectId: true, acceptedAt: true, cancelledAt: true },
  });
  if (!invite) throw inviteNotFound();
  await requireOwner(db, userId, invite.projectId);
  if (invite.acceptedAt || invite.cancelledAt) throw notPending();
  return invite;
}

/** A fresh link (new token, 7 more days) for a pending invite, and the email again. */
export async function resendInvite(userId: string, inviteId: string): Promise<SentInviteResponse> {
  const { token, tokenHash } = createToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  const pending = await requirePendingInviteAsOwner(prisma, userId, inviteId);
  const details = await emailDetails(prisma, pending.projectId, userId);

  const invite = await transaction(async (tx) => {
    const saved = await tx.invite.update({
      where: { id: pending.id },
      data: { tokenHash, expiresAt, invitedById: userId },
      select: inviteSelect,
    });
    await tx.activity.create({
      data: {
        projectId: pending.projectId,
        actorId: userId,
        action: ActivityAction.MemberInvited,
        meta: { email: pending.email, resent: true },
      },
    });
    return saved;
  });

  // Committed: now the email.
  await sendInvite(invite.email, token, details);
  return { ...toInviteResponse(invite), resent: true };
}

/** Cancel a pending invite. The row stays (stamped), so its link can say it was cancelled. */
export async function cancelInvite(userId: string, inviteId: string): Promise<CancelInviteResponse> {
  return transaction(async (tx) => {
    const pending = await requirePendingInviteAsOwner(tx, userId, inviteId);
    await tx.invite.update({ where: { id: pending.id }, data: { cancelledAt: new Date() } });
    await tx.activity.create({
      data: {
        projectId: pending.projectId,
        actorId: userId,
        action: ActivityAction.InviteCancelled,
        meta: { email: pending.email },
      },
    });
    return { id: pending.id };
  });
}

/** What a link shows, before anyone acts on it. Public: the token itself is the secret. */
export async function previewInvite(token: string): Promise<InvitePreview> {
  const invite = await prisma.invite.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      email: true,
      expiresAt: true,
      acceptedAt: true,
      cancelledAt: true,
      invitedBy: { select: { name: true, email: true } },
      project: { select: { name: true, colour: true, description: true } },
    },
  });
  if (!invite) return { state: "invalid" };
  if (invite.acceptedAt) return { state: "used" };
  if (invite.cancelledAt) return { state: "cancelled" };
  const inviterName = displayName(invite.invitedBy);
  if (invite.expiresAt.getTime() <= Date.now()) {
    return { state: "expired", inviterName, projectName: invite.project.name };
  }
  return { state: "valid", email: invite.email, inviterName, project: invite.project };
}

/** Join the project the link is for. Only the invited email may use it. */
export async function acceptInvite(userId: string, token: string): Promise<AcceptInviteResponse> {
  return transaction(async (tx) => {
    const [user, invite] = await Promise.all([
      tx.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } }),
      tx.invite.findUnique({
        where: { tokenHash: hashToken(token) },
        select: {
          id: true,
          email: true,
          projectId: true,
          expiresAt: true,
          acceptedAt: true,
          cancelledAt: true,
          invitedBy: { select: { name: true, email: true } },
          project: { select: { name: true } },
        },
      }),
    ]);
    if (!invite) throw inviteNotFound();
    if (invite.email !== normaliseEmail(user.email)) {
      throw new ApiError(403, "INVITE_EMAIL_MISMATCH", "This invite is for a different email address.");
    }
    if (invite.acceptedAt) throw new ApiError(400, "INVITE_USED", "This invite has already been used.");
    if (invite.cancelledAt) throw new ApiError(400, "INVITE_CANCELLED", "This invite was cancelled.");
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new ApiError(400, "INVITE_EXPIRED", "This invite has expired. Ask the owner to send a new one.");
    }

    // Conditional, so two clicks (or two tabs) can't both use it.
    const { count } = await tx.invite.updateMany({
      where: { id: invite.id, acceptedAt: null, cancelledAt: null },
      data: { acceptedAt: new Date() },
    });
    if (count === 0) throw new ApiError(400, "INVITE_USED", "This invite has already been used.");

    const result = { projectId: invite.projectId, projectName: invite.project.name };
    const already = await tx.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId: invite.projectId } },
      select: { role: true },
    });
    if (already) return result;

    await tx.projectMember.create({ data: { userId, projectId: invite.projectId, role: "MEMBER" } });
    await tx.activity.create({
      data: {
        projectId: invite.projectId,
        actorId: userId,
        action: ActivityAction.MemberJoined,
        meta: { invitedBy: displayName(invite.invitedBy) },
      },
    });
    return result;
  });
}
