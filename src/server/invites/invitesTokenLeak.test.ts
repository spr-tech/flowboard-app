// @vitest-environment node
// Accepting an invite confirms the user's email (verifyThroughInvite), and the verification gate
// lets unconfirmed users accept. That is only sound if the link's token reaches nobody but the
// invitee's inbox. If an inviter could obtain it, they could pre-register someone else's address,
// invite it, accept their own link, and get the address marked confirmed. These tests hold that line.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/server/lib/secureToken";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { INVITE_TTL_MS, cancelInvite, createInvite, listInvites, resendInvite } from "./invites.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
const { sendEmail } = await import("@/server/lib/email");

const NOW = new Date("2026-11-24T10:00:00.000Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW };
const saved = { id: "inv1", email: "ada@team.dev", expiresAt: new Date(NOW.getTime() + INVITE_TTL_MS) };
const pending = { ...saved, projectId: "p1", acceptedAt: null, cancelledAt: null };

beforeEach(() => {
  resetPrismaMock();
  vi.mocked(sendEmail).mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers({ now: NOW });
  prismaMock.project.findUniqueOrThrow.mockResolvedValue({ name: "Website relaunch", description: null } as never);
  prismaMock.user.findUniqueOrThrow.mockResolvedValue({ name: "Alex Morgan", email: "alex@team.dev" } as never);
  prismaMock.user.findUnique.mockResolvedValue({ emailVerified: NOW } as never);
  prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
  prismaMock.projectMember.findFirst.mockResolvedValue(null);
  prismaMock.invite.findFirst.mockResolvedValue(null);
  prismaMock.invite.create.mockResolvedValue(saved as never);
  prismaMock.invite.update.mockResolvedValue(saved as never);
  prismaMock.invite.findUnique.mockResolvedValue(pending as never);
  prismaMock.invite.findMany.mockResolvedValue([saved] as never);
});

/** Every token emailed so far, read from the links in the emails. */
function emailedTokens(): string[] {
  return vi.mocked(sendEmail).mock.calls.map(([message]) => /\/invite\/([\w-]+)/.exec(message.text)?.[1] ?? "");
}

/** What the database was asked to give back for invites: never the token's hash. */
function selectedFields(): string[] {
  const calls = [
    ...prismaMock.invite.create.mock.calls,
    ...prismaMock.invite.update.mock.calls,
    ...prismaMock.invite.findMany.mock.calls,
  ];
  return calls.flatMap(([args]) => Object.keys((args as { select?: object }).select ?? {}));
}

describe("an inviter can't obtain an invite's token", () => {
  it("through any invite API response: create, resend, list or cancel", async () => {
    const responses = [
      await createInvite("owner", "p1", "ada@team.dev"),
      await resendInvite("owner", "inv1"),
      await listInvites("owner", "p1"),
      await cancelInvite("owner", "inv1"),
    ];

    const tokens = emailedTokens();
    expect(tokens).toHaveLength(2);
    const body = JSON.stringify(responses);
    for (const token of tokens) {
      expect(token).not.toBe("");
      expect(body).not.toContain(token);
      expect(body).not.toContain(hashToken(token));
    }
    expect(selectedFields()).not.toContain("tokenHash");
  });

  it("the token goes in exactly one email, addressed to the invitee only", async () => {
    await createInvite("owner", "p1", "Ada@Team.dev");

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const message = vi.mocked(sendEmail).mock.calls[0][0];
    expect(message.to).toBe("ada@team.dev");
    expect(Object.keys(message).filter((key) => /^(cc|bcc|replyTo)$/i.test(key))).toEqual([]);
  });

  it("not even in the error when the email can't be sent", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP down"));

    const error = await createInvite("owner", "p1", "ada@team.dev").catch((thrown: unknown) => thrown);

    expect(error).toMatchObject({ status: 502, code: "EMAIL_NOT_SENT" });
    const token = /\/invite\/([\w-]+)/.exec(vi.mocked(sendEmail).mock.calls[0][0].text)?.[1] ?? "";
    expect(JSON.stringify(error)).not.toContain(token);
    expect(String((error as Error).message)).not.toContain(token);
  });
});
