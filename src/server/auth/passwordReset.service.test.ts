// @vitest-environment node
import { createHash } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "@/server/lib/email";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import {
  createResetToken,
  getResetTokenState,
  hashResetToken,
  requestPasswordReset,
  RESET_EMAILS_PER_HOUR,
  RESET_TOKEN_TTL_MS,
  resetPassword,
} from "./passwordReset.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
// Real bcrypt is slow on purpose; the hashing itself isn't what these tests check.
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async (value: string) => `hashed:${value}`) } }));

const NOW = new Date("2026-11-19T12:00:00Z");
const BASE_URL = "https://flowboard.test";
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

const passwordUser = { id: "user-1", email: "ada@example.com", name: "Ada Okafor", passwordHash: "bcrypt-hash" };
const githubUser = { ...passwordUser, id: "user-2", passwordHash: null };

/** The token in the link of the last email sent. */
function tokenFromLastEmail(): string {
  const { text } = vi.mocked(sendEmail).mock.calls.at(-1)![0];
  const match = text.match(/\/reset-password\/([A-Za-z0-9_-]+)/);
  if (!match) throw new Error(`No reset link in: ${text}`);
  return match[1];
}

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: NOW });
});

describe("createResetToken", () => {
  it("makes a 256-bit URL-safe token and its SHA-256 hash", () => {
    const { token, tokenHash } = createResetToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes in base64url
    expect(tokenHash).toBe(sha256(token));
    expect(tokenHash).not.toContain(token);
  });

  it("makes a different token every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => createResetToken().token));
    expect(tokens.size).toBe(50);
  });

  it("hashes the same token to the same value", () => {
    expect(hashResetToken("abc")).toBe(sha256("abc"));
  });
});

describe("requestPasswordReset", () => {
  it("looks the email up trimmed and lowercased", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await requestPasswordReset("  Ada@Example.COM ", BASE_URL);

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@example.com" } }),
    );
  });

  it("does nothing for an unknown email: no token, no email", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(requestPasswordReset("nobody@example.com", BASE_URL)).resolves.toBe("unknown-email");
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("emails a link whose token is stored only as its hash, expiring in 1 hour", async () => {
    prismaMock.user.findUnique.mockResolvedValue(passwordUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(0);

    await expect(requestPasswordReset(passwordUser.email, BASE_URL)).resolves.toBe("sent");

    const token = tokenFromLastEmail();
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe("ada@example.com");
    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        tokenHash: sha256(token),
        expiresAt: new Date(NOW.getTime() + RESET_TOKEN_TTL_MS),
      },
    });
    // The raw token is never written to the database.
    expect(JSON.stringify(prismaMock.passwordResetToken.create.mock.calls)).not.toContain(token);
  });

  it("cancels older unused links (marks them used, never deletes them)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(passwordUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(1);

    await requestPasswordReset(passwordUser.email, BASE_URL);

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: NOW },
    });
    expect(prismaMock.passwordResetToken.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
  });

  it(`counts this hour's requests from PasswordResetToken rows`, async () => {
    prismaMock.user.findUnique.mockResolvedValue(passwordUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(0);

    await requestPasswordReset(passwordUser.email, BASE_URL);

    expect(prismaMock.passwordResetToken.count).toHaveBeenCalledWith({
      where: { userId: "user-1", createdAt: { gte: new Date(NOW.getTime() - 60 * 60 * 1000) } },
    });
  });

  it(`sends the ${RESET_EMAILS_PER_HOUR}rd email of the hour`, async () => {
    prismaMock.user.findUnique.mockResolvedValue(passwordUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(RESET_EMAILS_PER_HOUR - 1);

    await expect(requestPasswordReset(passwordUser.email, BASE_URL)).resolves.toBe("sent");
    expect(sendEmail).toHaveBeenCalledOnce();
  });

  it(`sends nothing once ${RESET_EMAILS_PER_HOUR} have gone out this hour`, async () => {
    prismaMock.user.findUnique.mockResolvedValue(passwordUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(RESET_EMAILS_PER_HOUR);

    await expect(requestPasswordReset(passwordUser.email, BASE_URL)).resolves.toBe("rate-limited");
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.create).not.toHaveBeenCalled();
    expect(prismaMock.passwordResetToken.updateMany).not.toHaveBeenCalled();
  });

  it("sends GitHub-only users the 'sign in with GitHub' email, with no reset link", async () => {
    prismaMock.user.findUnique.mockResolvedValue(githubUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(0);

    await expect(requestPasswordReset(githubUser.email, BASE_URL)).resolves.toBe("github-only");

    const email = vi.mocked(sendEmail).mock.calls[0][0];
    expect(email.subject).toBe("How to sign in to Flowboard");
    expect(email.text).toContain(`${BASE_URL}/login`);
    expect(email.text).not.toContain("/reset-password/");
  });

  it("still counts GitHub-only emails toward the limit, with a row that can never be redeemed", async () => {
    prismaMock.user.findUnique.mockResolvedValue(githubUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(0);

    await requestPasswordReset(githubUser.email, BASE_URL);

    expect(prismaMock.passwordResetToken.create).toHaveBeenCalledWith({
      data: { userId: "user-2", tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/), expiresAt: NOW, usedAt: NOW },
    });
  });

  it("rate-limits GitHub-only users too", async () => {
    prismaMock.user.findUnique.mockResolvedValue(githubUser as never);
    prismaMock.passwordResetToken.count.mockResolvedValue(RESET_EMAILS_PER_HOUR);

    await expect(requestPasswordReset(githubUser.email, BASE_URL)).resolves.toBe("rate-limited");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});

describe("getResetTokenState", () => {
  const future = new Date(NOW.getTime() + 60_000);
  const past = new Date(NOW.getTime() - 1);

  it("looks the token up by its hash, never the token itself", async () => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(null);
    await getResetTokenState("raw-token");

    expect(prismaMock.passwordResetToken.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: sha256("raw-token") } }),
    );
  });

  it.each([
    ["invalid", null],
    ["valid", { id: "t", userId: "u", expiresAt: future, usedAt: null }],
    ["expired", { id: "t", userId: "u", expiresAt: past, usedAt: null }],
    ["used", { id: "t", userId: "u", expiresAt: future, usedAt: past }],
    ["used", { id: "t", userId: "u", expiresAt: past, usedAt: past }],
  ])("reports %s", async (expected, row) => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(row as never);
    await expect(getResetTokenState("token")).resolves.toBe(expected);
  });

  it("expires exactly 1 hour after the link was made", async () => {
    const expiresAt = new Date(NOW.getTime() + RESET_TOKEN_TTL_MS);
    prismaMock.passwordResetToken.findUnique.mockResolvedValue({ id: "t", userId: "u", expiresAt, usedAt: null } as never);

    vi.setSystemTime(new Date(expiresAt.getTime() - 1));
    await expect(getResetTokenState("token")).resolves.toBe("valid");

    vi.setSystemTime(expiresAt);
    await expect(getResetTokenState("token")).resolves.toBe("expired");
  });
});

describe("resetPassword", () => {
  const validRow = { id: "token-1", userId: "user-1", expiresAt: new Date(NOW.getTime() + 60_000), usedAt: null };

  beforeEach(() => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(validRow as never);
    prismaMock.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.user.update.mockResolvedValue({ email: "ada@example.com" } as never);
  });

  it("uses the token once, saves the new hash and sets passwordChangedAt, in one transaction", async () => {
    await expect(resetPassword("token", "new-password")).resolves.toEqual({ email: "ada@example.com" });

    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "token-1", usedAt: null, expiresAt: { gt: NOW } },
      data: { usedAt: NOW },
    });
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { passwordHash: "hashed:new-password", passwordChangedAt: NOW },
      select: { email: true },
    });
  });

  it("also cancels the user's other unused links", async () => {
    await resetPassword("token", "new-password");

    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenNthCalledWith(2, {
      where: { userId: "user-1", usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it.each([
    ["TOKEN_INVALID", null],
    ["TOKEN_USED", { ...validRow, usedAt: new Date(NOW.getTime() - 1000) }],
    ["TOKEN_EXPIRED", { ...validRow, expiresAt: new Date(NOW.getTime() - 1) }],
  ])("refuses with %s and changes nothing", async (code, row) => {
    prismaMock.passwordResetToken.findUnique.mockResolvedValue(row as never);

    await expect(resetPassword("token", "new-password")).rejects.toMatchObject({ status: 400, code });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("lets only one of two simultaneous uses through", async () => {
    // Both requests read the token as unused; the other one claimed it first.
    prismaMock.passwordResetToken.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(resetPassword("token", "new-password")).rejects.toMatchObject({ code: "TOKEN_USED" });
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});
