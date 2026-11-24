// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { hashToken } from "@/server/lib/secureToken";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import {
  INVITE_TTL_MS,
  acceptInvite,
  cancelInvite,
  createInvite,
  listInvites,
  previewInvite,
  resendInvite,
} from "./invites.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
const { sendEmail } = await import("@/server/lib/email");

const NOW = new Date("2026-11-23T10:00:00.000Z");
const owner = { role: "OWNER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW };
const member = { ...owner, role: "MEMBER" };
const saved = { id: "inv1", email: "ada@team.dev", expiresAt: new Date(NOW.getTime() + INVITE_TTL_MS) };

beforeEach(() => {
  resetPrismaMock();
  vi.mocked(sendEmail).mockReset().mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  prismaMock.project.findUniqueOrThrow.mockResolvedValue({ name: "Website relaunch", description: null } as never);
  prismaMock.user.findUniqueOrThrow.mockResolvedValue({ name: "Alex Morgan", email: "demo@example.com" } as never);
  // The inviter has a confirmed email (the unconfirmed case has its own tests below).
  prismaMock.user.findUnique.mockResolvedValue({ emailVerified: NOW } as never);
  prismaMock.user.updateMany.mockResolvedValue({ count: 0 });
});
afterEach(() => vi.useRealTimers());

/**
 * Holds the next prisma.$transaction open until release() is called, so a test can check what
 * happened while it was still running (the callback itself has run; the commit hasn't).
 */
function holdTransaction() {
  let release = () => {};
  const gate = new Promise<void>((resolve) => (release = resolve));
  prismaMock.$transaction.mockImplementationOnce((async (arg: unknown) => {
    const result = typeof arg === "function" ? await arg(prismaMock) : await Promise.all(arg as Promise<unknown>[]);
    await gate;
    return result;
  }) as never);
  return { release: () => release() };
}

/** Lets every already-settled promise run its callbacks (fake timers don't affect this). */
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

/** The token in the emailed link. */
const sentToken = () => /\/invite\/([\w-]+)/.exec(vi.mocked(sendEmail).mock.calls[0][0].text)?.[1] ?? "";

describe("createInvite", () => {
  it("sends the email only after the transaction has committed, with the shared limits", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue(saved as never);
    const held = holdTransaction();

    const result = createInvite("owner", "p1", "ada@team.dev");
    await flush();

    expect(prismaMock.invite.create).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    held.release();
    await result;
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { maxWait: 10_000, timeout: 15_000 });
  });

  it("keeps the checks and the email's details out of the transaction: only the writes are inside", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue(saved as never);
    const insideTransaction: string[] = [];
    prismaMock.$transaction.mockImplementationOnce((async (fn: (tx: unknown) => Promise<unknown>) => {
      const spy = new Proxy(prismaMock, {
        get: (target, model: string) =>
          new Proxy(target[model as keyof typeof target] as object, {
            get: (methods, method: string) => {
              insideTransaction.push(`${model}.${method}`);
              return methods[method as keyof typeof methods];
            },
          }),
      });
      return fn(spy);
    }) as never);

    await createInvite("owner", "p1", "ada@team.dev");

    expect(insideTransaction).toEqual(["invite.create", "activity.create"]);
  });

  it("creates a 7-day invite for the lowercased email, stores only the token's hash, and emails the link", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue(saved as never);

    const result = await createInvite("owner", "p1", "  Ada@Team.dev ");

    expect(result).toEqual({
      id: "inv1",
      email: "ada@team.dev",
      sentAt: NOW.toISOString(),
      expiresAt: saved.expiresAt.toISOString(),
      resent: false,
    });
    const data = prismaMock.invite.create.mock.calls[0][0].data as {
      email: string;
      tokenHash: string;
      expiresAt: Date;
    };
    expect(data.email).toBe("ada@team.dev");
    expect(data.expiresAt).toEqual(saved.expiresAt);
    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.to).toBe("ada@team.dev");
    expect(email.subject).toBe("Alex Morgan invited you to Website relaunch");
    expect(data.tokenHash).toBe(hashToken(sentToken()));
    expect(data.tokenHash).not.toContain(sentToken());
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "owner", action: "member.invited", meta: { email: "ada@team.dev" } },
    });
  });

  it("resends a pending invite for the same email on the same row instead of adding a second", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue({ id: "inv1" } as never);
    prismaMock.invite.update.mockResolvedValue(saved as never);

    const result = await createInvite("owner", "p1", "ada@team.dev");

    expect(result.resent).toBe(true);
    expect(prismaMock.invite.create).not.toHaveBeenCalled();
    expect(prismaMock.invite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "p1", email: "ada@team.dev", acceptedAt: null, cancelledAt: null },
      })
    );
    const data = prismaMock.invite.update.mock.calls[0][0].data as { tokenHash: string; expiresAt: Date };
    expect(data.tokenHash).toBe(hashToken(sentToken()));
    expect(data.expiresAt).toEqual(saved.expiresAt);
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "member.invited", meta: { email: "ada@team.dev", resent: true } }),
    });
  });

  it("answers 409 with '<name> is already a member.' for someone already in the project, and sends nothing", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue({ user: { name: "Sam Rivera", email: "sam@x.dev" } } as never);

    await expect(createInvite("owner", "p1", "sam@x.dev")).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_MEMBER",
      message: "Sam Rivera is already a member.",
      fields: { email: "Sam Rivera is already a member." },
    });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("404s for someone who isn't in the project (who may invite: invitesPermissions.test.ts)", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(null);
    await expect(createInvite("stranger", "p1", "ada@team.dev")).rejects.toMatchObject({ status: 404 });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("puts the project's description in the email, escaped", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue(saved as never);
    prismaMock.project.findUniqueOrThrow.mockResolvedValue({
      name: "<Launch>",
      description: 'Ship "it" & <b>win</b>',
    } as never);

    await createInvite("owner", "p1", "ada@team.dev");

    const { html, text } = vi.mocked(sendEmail).mock.calls[0][0];
    expect(text).toContain('About the project: Ship "it" & <b>win</b>');
    expect(html).toContain("Ship &quot;it&quot; &amp; &lt;b&gt;win&lt;/b&gt;");
    expect(html).toContain("Join &lt;Launch&gt;");
    expect(html).not.toContain("<b>win</b>");
  });

  it("reports a failed send as 502 EMAIL_NOT_SENT; the invite is already saved, so Resend works", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.projectMember.findFirst.mockResolvedValue(null);
    prismaMock.invite.findFirst.mockResolvedValue(null);
    prismaMock.invite.create.mockResolvedValue(saved as never);
    vi.mocked(sendEmail).mockRejectedValue(new Error("smtp down"));

    await expect(createInvite("owner", "p1", "ada@team.dev")).rejects.toMatchObject({
      status: 502,
      code: "EMAIL_NOT_SENT",
    });
    expect(prismaMock.invite.create).toHaveBeenCalled();
  });
});

describe("listInvites", () => {
  it("lists pending invites (not accepted, not cancelled) for the owner, with when each link was sent", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.invite.findMany.mockResolvedValue([saved] as never);

    expect(await listInvites("owner", "p1")).toEqual([
      { id: "inv1", email: "ada@team.dev", sentAt: NOW.toISOString(), expiresAt: saved.expiresAt.toISOString() },
    ]);
    expect(prismaMock.invite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "p1", acceptedAt: null, cancelledAt: null } })
    );
  });
});

describe("resendInvite and cancelInvite", () => {
  const pending = { ...saved, projectId: "p1", acceptedAt: null, cancelledAt: null };

  it("resend: the email goes only after the transaction has committed", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(pending as never);
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.invite.update.mockResolvedValue(saved as never);
    const held = holdTransaction();

    const result = resendInvite("owner", "inv1");
    await flush();

    expect(prismaMock.invite.update).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    held.release();
    await result;
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("resend: a new token and 7 more days, the email again", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(pending as never);
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.invite.update.mockResolvedValue(saved as never);

    expect(await resendInvite("owner", "inv1")).toMatchObject({ id: "inv1", resent: true });
    const data = prismaMock.invite.update.mock.calls[0][0].data as { tokenHash: string; expiresAt: Date };
    expect(data.tokenHash).toBe(hashToken(sentToken()));
    expect(data.expiresAt.getTime()).toBe(NOW.getTime() + INVITE_TTL_MS);
  });

  it("cancel: stamps cancelledAt (the row stays) and writes invite.cancelled", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(pending as never);
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);

    expect(await cancelInvite("owner", "inv1")).toEqual({ id: "inv1" });
    expect(prismaMock.invite.update).toHaveBeenCalledWith({ where: { id: "inv1" }, data: { cancelledAt: NOW } });
    expect(prismaMock.invite.delete).not.toHaveBeenCalled();
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "owner", action: "invite.cancelled", meta: { email: "ada@team.dev" } },
    });
  });

  it("refuses invites that are used or cancelled, members, and unknown ids", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(owner as never);
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...pending, acceptedAt: NOW } as never);
    await expect(resendInvite("owner", "inv1")).rejects.toMatchObject({ code: "INVITE_NOT_PENDING" });

    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...pending, cancelledAt: NOW } as never);
    await expect(cancelInvite("owner", "inv1")).rejects.toMatchObject({ code: "INVITE_NOT_PENDING" });

    prismaMock.invite.findUnique.mockResolvedValueOnce(pending as never);
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(member as never);
    await expect(cancelInvite("sam", "inv1")).rejects.toMatchObject({ status: 403 });

    prismaMock.invite.findUnique.mockResolvedValueOnce(null);
    await expect(resendInvite("owner", "nope")).rejects.toMatchObject({ status: 404, code: "INVITE_NOT_FOUND" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("previewInvite", () => {
  const row = {
    email: "ada@team.dev",
    expiresAt: new Date(NOW.getTime() + 1000),
    acceptedAt: null,
    cancelledAt: null,
    invitedBy: { name: null, email: "demo@example.com" },
    project: { name: "Website relaunch", colour: "lime", description: "Before January" },
  };

  it("looks the link up by its hash and shows a live invite", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(row as never);

    expect(await previewInvite("tok")).toEqual({
      state: "valid",
      email: "ada@team.dev",
      inviterName: "demo@example.com",
      project: { name: "Website relaunch", colour: "lime", description: "Before January" },
    });
    expect(prismaMock.invite.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashToken("tok") } })
    );
  });

  it("says expired (with who to ask), used, cancelled or invalid", async () => {
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, expiresAt: NOW } as never);
    expect(await previewInvite("tok")).toEqual({
      state: "expired",
      inviterName: "demo@example.com",
      projectName: "Website relaunch",
    });
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, acceptedAt: NOW } as never);
    expect(await previewInvite("tok")).toEqual({ state: "used" });
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, cancelledAt: NOW } as never);
    expect(await previewInvite("tok")).toEqual({ state: "cancelled" });
    prismaMock.invite.findUnique.mockResolvedValueOnce(null);
    expect(await previewInvite("tok")).toEqual({ state: "invalid" });
  });
});

describe("acceptInvite", () => {
  const row = {
    id: "inv1",
    email: "ada@team.dev",
    projectId: "p1",
    expiresAt: new Date(NOW.getTime() + 1000),
    acceptedAt: null,
    cancelledAt: null,
    invitedBy: { name: "Alex Morgan", email: "demo@example.com" },
    project: { name: "Website relaunch" },
  };

  beforeEach(() => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: "ada@team.dev" } as never);
    prismaMock.invite.findUnique.mockResolvedValue(row as never);
    prismaMock.invite.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
  });

  it("joins as MEMBER, marks the invite used (only if still unused) and writes member.joined", async () => {
    expect(await acceptInvite("ada", "tok")).toEqual({ projectId: "p1", projectName: "Website relaunch" });

    expect(prismaMock.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "inv1", acceptedAt: null, cancelledAt: null },
      data: { acceptedAt: NOW },
    });
    expect(prismaMock.projectMember.create).toHaveBeenCalledWith({
      data: { userId: "ada", projectId: "p1", role: "MEMBER" },
    });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: { projectId: "p1", actorId: "ada", action: "member.joined", meta: { invitedBy: "Alex Morgan" } },
    });
  });

  it("refuses a different signed-in email with 403, and changes nothing", async () => {
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({ email: "sam@example.com" } as never);

    await expect(acceptInvite("sam", "tok")).rejects.toMatchObject({ status: 403, code: "INVITE_EMAIL_MISMATCH" });
    expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
  });

  it("refuses used, cancelled, expired and unknown links", async () => {
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, acceptedAt: NOW } as never);
    await expect(acceptInvite("ada", "tok")).rejects.toMatchObject({ code: "INVITE_USED" });
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, cancelledAt: NOW } as never);
    await expect(acceptInvite("ada", "tok")).rejects.toMatchObject({ code: "INVITE_CANCELLED" });
    prismaMock.invite.findUnique.mockResolvedValueOnce({ ...row, expiresAt: NOW } as never);
    await expect(acceptInvite("ada", "tok")).rejects.toMatchObject({ code: "INVITE_EXPIRED" });
    prismaMock.invite.findUnique.mockResolvedValueOnce(null);
    await expect(acceptInvite("ada", "tok")).rejects.toMatchObject({ status: 404 });
    expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
  });

  it("lets only one of two simultaneous clicks through", async () => {
    prismaMock.invite.updateMany.mockResolvedValue({ count: 0 });

    await expect(acceptInvite("ada", "tok")).rejects.toMatchObject({ code: "INVITE_USED" });
    expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
  });

  it("someone already in the project just uses up the invite and goes to the board", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue({ role: "MEMBER" } as never);

    expect(await acceptInvite("ada", "tok")).toEqual({ projectId: "p1", projectName: "Website relaunch" });
    expect(prismaMock.projectMember.create).not.toHaveBeenCalled();
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });
});
