// @vitest-environment node
import { createHash } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getMe } from "@/server/account/account.service";
import { sendEmail } from "@/server/lib/email";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import {
  CODE_TTL_MS,
  LINK_TTL_MS,
  MAX_CODE_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  createCode,
  getVerificationStatus,
  hashCode,
  nextSendAt,
  onSignIn,
  requireVerifiedEmail,
  sendVerificationCode,
  verifyCode,
  verifyLink,
  verifyThroughInvite,
} from "./emailVerification.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/server/account/account.service", () => ({ getMe: vi.fn() }));

const NOW = new Date("2026-11-23T12:00:00.000Z");
const MINUTE = 60 * 1000;
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const unverified = { id: "u1", email: "ada@example.com", name: "Ada Okafor", emailVerified: null };
const me = {
  id: "u1",
  name: "Ada Okafor",
  email: "ada@example.com",
  image: null,
  hasPassword: true,
  emailVerified: true,
};

/** A live row for code "123456". */
const liveRow = (overrides: Record<string, unknown> = {}) => ({
  id: "row1",
  codeHash: hashCode("u1", "123456"),
  codeExpiresAt: new Date(NOW.getTime() + CODE_TTL_MS),
  attempts: 0,
  ...overrides,
});

/** The code and link token in the last email sent. */
function lastEmail() {
  const message = vi.mocked(sendEmail).mock.calls.at(-1)![0];
  const code = /^Your Flowboard code: (\d{6})$/.exec(message.subject)?.[1] ?? "";
  const token = /\/verify-email\/link\/([\w-]+)/.exec(message.text)?.[1] ?? "";
  return { message, code, token };
}

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: NOW });
  vi.stubEnv("APP_URL", "https://flowboard.test");
  vi.mocked(sendEmail).mockReset().mockResolvedValue(undefined);
  vi.mocked(getMe).mockResolvedValue(me);
  prismaMock.user.findUnique.mockResolvedValue(unverified as never);
  prismaMock.user.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.emailVerificationToken.findMany.mockResolvedValue([]);
  prismaMock.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
  prismaMock.emailVerificationToken.create.mockImplementation((async () => ({ createdAt: new Date() })) as never);
});
afterEach(() => vi.useRealTimers());

describe("codes and hashing", () => {
  it("makes six random digits, zero-padded", () => {
    const codes = Array.from({ length: 200 }, createCode);

    for (const code of codes) expect(code).toMatch(/^\d{6}$/);
    expect(new Set(codes).size).toBeGreaterThan(190);
  });

  it("hashes with SHA-256 over the user id and the code, so equal codes differ between users", () => {
    expect(hashCode("u1", "123456")).toBe(sha256("u1:123456"));
    expect(hashCode("u1", "123456")).not.toBe(hashCode("u2", "123456"));
  });
});

describe("sendVerificationCode", () => {
  it("stores only hashes, with a 15-minute code and a 24-hour link, then emails both", async () => {
    await sendVerificationCode("u1");

    const { message, code, token } = lastEmail();
    const data = prismaMock.emailVerificationToken.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: "u1",
      codeHash: sha256(`u1:${code}`),
      linkTokenHash: sha256(token),
      codeExpiresAt: new Date(NOW.getTime() + CODE_TTL_MS),
      linkExpiresAt: new Date(NOW.getTime() + LINK_TTL_MS),
    });
    expect(token).toMatch(/^[\w-]{43}$/); // 32 bytes in base64url
    expect(JSON.stringify(data)).not.toContain(code);
    expect(JSON.stringify(data)).not.toContain(token);
    expect(message.to).toBe("ada@example.com");
    expect(message.text).toContain("https://flowboard.test/verify-email/link/");
    expect(message.text).toContain("It expires in 15 minutes.");
    expect(message.text).toContain("If you didn't create a Flowboard account, you can ignore this email.");
  });

  it("cancels older unused codes and links in the same transaction", async () => {
    await sendVerificationCode("u1");

    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: NOW },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it("sends the email only after the transaction has committed", async () => {
    let committed = false;
    prismaMock.$transaction.mockImplementationOnce((async (fn: (tx: unknown) => Promise<unknown>) => {
      const result = await fn(prismaMock);
      expect(sendEmail).not.toHaveBeenCalled();
      committed = true;
      return result;
    }) as never);

    await sendVerificationCode("u1");

    expect(committed).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it("refuses a 4th send in the same hour (429 SEND_LIMIT), counting the rows", async () => {
    prismaMock.emailVerificationToken.findMany.mockResolvedValue([
      { createdAt: ago(5 * MINUTE) },
      { createdAt: ago(20 * MINUTE) },
      { createdAt: ago(50 * MINUTE) },
    ] as never);

    await expect(sendVerificationCode("u1")).rejects.toMatchObject({
      status: 429,
      code: "SEND_LIMIT",
      message: "You've asked for 3 codes in the last hour. Try again in 10 minutes.",
    });
    expect(prismaMock.emailVerificationToken.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prismaMock.emailVerificationToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", createdAt: { gt: ago(60 * MINUTE) } } })
    );
  });

  it("refuses another send within a minute of the last (429 SEND_TOO_SOON)", async () => {
    prismaMock.emailVerificationToken.findMany.mockResolvedValue([{ createdAt: ago(20 * 1000) }] as never);

    await expect(sendVerificationCode("u1")).rejects.toMatchObject({
      status: 429,
      code: "SEND_TOO_SOON",
      message: "Wait 40 seconds before asking for another code.",
    });
  });

  it("locks the user row first, so two sends at the same moment take turns", async () => {
    await sendVerificationCode("u1");

    const lock = prismaMock.user.update.mock.invocationCallOrder[0];
    const count = prismaMock.emailVerificationToken.findMany.mock.invocationCallOrder[0];
    expect(lock).toBeLessThan(count);
  });

  it("refuses when the email is already confirmed", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...unverified, emailVerified: NOW } as never);

    await expect(sendVerificationCode("u1")).rejects.toMatchObject({ status: 400, code: "ALREADY_VERIFIED" });
  });

  it("reports a failed send as 502 EMAIL_NOT_SENT", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new Error("SMTP down"));

    await expect(sendVerificationCode("u1")).rejects.toMatchObject({ status: 502, code: "EMAIL_NOT_SENT" });
  });

  it("returns the status after sending: a one-minute wait, and one fewer send left", async () => {
    const status = await sendVerificationCode("u1");

    expect(status).toEqual({
      email: "ada@example.com",
      isVerified: false,
      resendAvailableAt: new Date(NOW.getTime() + RESEND_COOLDOWN_MS).toISOString(),
      sendsLeftThisHour: 2,
    });
  });
});

describe("nextSendAt and getVerificationStatus", () => {
  it("is null when nothing was sent recently", () => {
    expect(nextSendAt([], NOW)).toBeNull();
    expect(nextSendAt([{ createdAt: ago(2 * MINUTE) }], NOW)).toBeNull();
  });

  it("after 3 sends, waits until the oldest of them is an hour old", () => {
    const sends = [{ createdAt: ago(5 * MINUTE) }, { createdAt: ago(6 * MINUTE) }, { createdAt: ago(40 * MINUTE) }];

    expect(nextSendAt(sends, NOW)).toEqual(new Date(NOW.getTime() + 20 * MINUTE));
  });

  it("reports a confirmed user as verified, with nothing to wait for", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...unverified, emailVerified: NOW } as never);

    expect(await getVerificationStatus("u1")).toEqual({
      email: "ada@example.com",
      isVerified: true,
      resendAvailableAt: null,
      sendsLeftThisHour: 3,
    });
  });
});

describe("verifyCode", () => {
  it("confirms the email with the right code: claims the row and sets emailVerified together", async () => {
    prismaMock.emailVerificationToken.findFirst.mockResolvedValue(liveRow() as never);

    expect(await verifyCode("u1", "123456")).toEqual(me);
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { id: "row1", usedAt: null, codeExpiresAt: { gt: NOW }, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { usedAt: NOW },
    });
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", emailVerified: null },
      data: { emailVerified: NOW },
    });
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it("lets only one of two simultaneous submits succeed (atomic use)", async () => {
    prismaMock.emailVerificationToken.findFirst.mockResolvedValue(liveRow() as never);
    prismaMock.emailVerificationToken.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(verifyCode("u1", "123456")).rejects.toMatchObject({ code: "CODE_EXPIRED" });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("counts wrong codes down: 4, 3, 2, 1 attempts left", async () => {
    for (const attempts of [0, 1, 2, 3]) {
      prismaMock.emailVerificationToken.findFirst.mockResolvedValueOnce(liveRow({ attempts }) as never);
      prismaMock.emailVerificationToken.findUnique.mockResolvedValueOnce({ attempts: attempts + 1 } as never);
      const left = MAX_CODE_ATTEMPTS - attempts - 1;

      await expect(verifyCode("u1", "000000")).rejects.toMatchObject({
        status: 400,
        code: "CODE_WRONG",
        message: `Wrong code. ${left} ${left === 1 ? "attempt" : "attempts"} left.`,
      });
    }
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { id: "row1", usedAt: null, attempts: { lt: MAX_CODE_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
  });

  it("stops the code after the 5th wrong attempt, even if the right code follows", async () => {
    prismaMock.emailVerificationToken.findFirst.mockResolvedValueOnce(liveRow({ attempts: 4 }) as never);
    prismaMock.emailVerificationToken.findUnique.mockResolvedValueOnce({ attempts: 5 } as never);
    await expect(verifyCode("u1", "000000")).rejects.toMatchObject({ code: "TOO_MANY_ATTEMPTS" });

    prismaMock.emailVerificationToken.findFirst.mockResolvedValueOnce(liveRow({ attempts: 5 }) as never);
    await expect(verifyCode("u1", "123456")).rejects.toMatchObject({
      code: "TOO_MANY_ATTEMPTS",
      message: "Too many attempts. Send a new code.",
    });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("refuses a code after 15 minutes (CODE_EXPIRED)", async () => {
    prismaMock.emailVerificationToken.findFirst.mockResolvedValue(liveRow() as never);
    vi.setSystemTime(new Date(NOW.getTime() + CODE_TTL_MS));

    await expect(verifyCode("u1", "123456")).rejects.toMatchObject({
      code: "CODE_EXPIRED",
      message: "This code has expired. Send a new one.",
    });
  });

  it("treats a cancelled (older) code as expired: only the newest unused row is checked", async () => {
    prismaMock.emailVerificationToken.findFirst.mockResolvedValue(null);

    await expect(verifyCode("u1", "123456")).rejects.toMatchObject({ code: "CODE_EXPIRED" });
    expect(prismaMock.emailVerificationToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", usedAt: null }, orderBy: { createdAt: "desc" } })
    );
  });

  it("answers with the user straight away if the email is already confirmed", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...unverified, emailVerified: NOW } as never);

    expect(await verifyCode("u1", "999999")).toEqual(me);
    expect(prismaMock.emailVerificationToken.findFirst).not.toHaveBeenCalled();
  });
});

describe("verifyLink", () => {
  const token = "link-token";
  const linkRow = (overrides: Record<string, unknown> = {}) => ({
    id: "row1",
    userId: "u1",
    usedAt: null,
    linkExpiresAt: new Date(NOW.getTime() + LINK_TTL_MS),
    user: { email: "ada@example.com" },
    ...overrides,
  });

  it("looks the link up by its hash, claims it and confirms the email", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(linkRow() as never);

    expect(await verifyLink(token)).toEqual({ email: "ada@example.com" });
    expect(prismaMock.emailVerificationToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { linkTokenHash: sha256(token) } })
    );
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { id: "row1", usedAt: null, linkExpiresAt: { gt: NOW } },
      data: { usedAt: NOW },
    });
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "u1", emailVerified: null } })
    );
  });

  it("works once: a used link answers TOKEN_USED", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(linkRow({ usedAt: ago(MINUTE) }) as never);

    await expect(verifyLink(token)).rejects.toMatchObject({ status: 400, code: "TOKEN_USED" });
  });

  it("lets only one of two simultaneous clicks succeed", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(linkRow() as never);
    prismaMock.emailVerificationToken.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(verifyLink(token)).rejects.toMatchObject({ code: "TOKEN_USED" });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("expires after 24 hours (TOKEN_EXPIRED), and isn't affected by wrong code attempts", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({ ...linkRow(), attempts: 5 } as never);
    vi.setSystemTime(new Date(NOW.getTime() + LINK_TTL_MS - 1));
    await expect(verifyLink(token)).resolves.toEqual({ email: "ada@example.com" });

    vi.setSystemTime(new Date(NOW.getTime() + LINK_TTL_MS));
    await expect(verifyLink(token)).rejects.toMatchObject({ code: "TOKEN_EXPIRED" });
  });

  it("answers TOKEN_INVALID for an unknown link", async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null);

    await expect(verifyLink(token)).rejects.toMatchObject({ code: "TOKEN_INVALID" });
  });
});

describe("inviting, invites and GitHub", () => {
  it("blocks unverified users with 403 EMAIL_NOT_VERIFIED", async () => {
    await expect(requireVerifiedEmail(prismaMock, "u1")).rejects.toMatchObject({
      status: 403,
      code: "EMAIL_NOT_VERIFIED",
      message: "Confirm your email before inviting people.",
    });

    prismaMock.user.findUnique.mockResolvedValue({ emailVerified: NOW } as never);
    await expect(requireVerifiedEmail(prismaMock, "u1")).resolves.toBeUndefined();
  });

  it("accepting an invite confirms the email and retires any waiting code", async () => {
    await verifyThroughInvite(prismaMock, "u1");

    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", emailVerified: null },
      data: { emailVerified: NOW },
    });
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it("a GitHub sign-in marks the user verified if it's empty; a password sign-in doesn't", async () => {
    await onSignIn({ user: { id: "u1" }, account: { provider: "github" } });
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", emailVerified: null },
      data: { emailVerified: NOW },
    });

    prismaMock.user.updateMany.mockClear();
    await onSignIn({ user: { id: "u1" }, account: { provider: "credentials" } });
    expect(prismaMock.user.updateMany).not.toHaveBeenCalled();
  });

  it("a Google sign-in (new or linked user) marks the user verified, so they skip the code", async () => {
    await onSignIn({ user: { id: "u1" }, account: { provider: "google" } });
    expect(prismaMock.user.updateMany).toHaveBeenCalledWith({
      where: { id: "u1", emailVerified: null },
      data: { emailVerified: NOW },
    });
  });
});
