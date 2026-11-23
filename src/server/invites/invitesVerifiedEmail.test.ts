// @vitest-environment node
// Invites and email verification: unconfirmed owners can't send invites (403), and accepting an
// invite confirms the accepter's email. The rest of the invite rules are in invites.service.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { INVITE_TTL_MS, acceptInvite, cancelInvite, createInvite, resendInvite } from "./invites.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
const { sendEmail } = await import("@/server/lib/email");

const NOW = new Date("2026-11-23T10:00:00.000Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW };
const pending = {
  id: "inv1",
  email: "ada@team.dev",
  projectId: "p1",
  expiresAt: new Date(NOW.getTime() + INVITE_TTL_MS),
  acceptedAt: null,
  cancelledAt: null,
};

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: NOW });
  prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
  // The owner hasn't confirmed their email.
  prismaMock.user.findUnique.mockResolvedValue({ emailVerified: null } as never);
});
afterEach(() => vi.useRealTimers());

describe("unconfirmed owners", () => {
  it("can't invite: 403 EMAIL_NOT_VERIFIED, nothing saved, no email", async () => {
    await expect(createInvite("owner", "p1", "ada@team.dev")).rejects.toMatchObject({
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirm your email before inviting people.",
    });
    expect(prismaMock.invite.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("can't resend either", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(pending as never);

    await expect(resendInvite("owner", "inv1")).rejects.toMatchObject({ status: 403, code: "EMAIL_NOT_VERIFIED" });
    expect(prismaMock.invite.update).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("still get 404 for a project they aren't in (membership is checked first)", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(createInvite("stranger", "p1", "ada@team.dev")).rejects.toMatchObject({ status: 404 });
  });

  it("can still cancel an invite (it sends no email)", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(pending as never);

    await expect(cancelInvite("owner", "inv1")).resolves.toEqual({ id: "inv1" });
  });
});

describe("accepting an invite", () => {
  beforeEach(() => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: "ada@team.dev" } as never);
    prismaMock.invite.findUnique.mockResolvedValue({
      ...pending,
      invitedBy: { name: "Alex Morgan", email: "demo@example.com" },
      project: { name: "Website relaunch" },
    } as never);
    prismaMock.invite.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
  });

  it("confirms the accepter's email in the same transaction, and retires any waiting code", async () => {
    await acceptInvite("ada", "tok");

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "ada", emailVerified: null },
      data: { emailVerified: NOW },
    });
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "ada", usedAt: null },
      data: { usedAt: NOW },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it("doesn't confirm anything when the invite is for another email", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: "sam@example.com" } as never);

    await expect(acceptInvite("sam", "tok")).rejects.toMatchObject({ code: "INVITE_EMAIL_MISMATCH" });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });
});
