// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { checkOAuthSignIn } from "./oauthSignIn.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const NOW = new Date("2026-11-24T10:00:00Z");
const google = { provider: "google", providerAccountId: "g-123" };
const github = { provider: "github", providerAccountId: "gh-9" };
const verifiedProfile = { email: "ada@example.com", email_verified: true };
const noSession = async () => false;

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: NOW });
  prismaMock.account.findUnique.mockResolvedValue(null);
  prismaMock.user.findUnique.mockResolvedValue(null);
});

describe("checkOAuthSignIn", () => {
  it("leaves email-and-password sign-ins alone", async () => {
    const hasValidSession = vi.fn(async () => true);
    const result = await checkOAuthSignIn({
      account: { provider: "credentials", providerAccountId: "u1" },
      profile: undefined,
      hasValidSession,
    });

    expect(result).toBe(true);
    expect(hasValidSession).not.toHaveBeenCalled();
  });

  it("refuses Google and GitHub while a valid session exists, before anything else", async () => {
    for (const account of [google, github]) {
      const result = await checkOAuthSignIn({ account, profile: verifiedProfile, hasValidSession: async () => true });
      expect(result).toBe("/login?error=SignOutFirst");
    }
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("allows the sign-in when the only cookie left is from an expired or ended session", async () => {
    // hasValidSession is auth(): an expired token, a wrong signature, a deleted user or a password
    // changed since all come back as no session, so a leftover cookie doesn't block anything.
    await expect(
      checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession })
    ).resolves.toBe(true);
    await expect(checkOAuthSignIn({ account: github, profile: {}, hasValidSession: noSession })).resolves.toBe(true);
  });

  it("refuses a Google email that Google hasn't verified, and never links it", async () => {
    for (const profile of [{ email: "ada@example.com", email_verified: false }, { email: "ada@example.com" }]) {
      const result = await checkOAuthSignIn({ account: google, profile, hasValidSession: noSession });
      expect(result).toBe("/login?error=GoogleEmailUnverified");
    }
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("lets a new Google user through (Auth.js creates the account)", async () => {
    await expect(
      checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession })
    ).resolves.toBe(true);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("links to a verified account without touching its password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: NOW } as never);

    await expect(
      checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession })
    ).resolves.toBe(true);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("takes over an unverified account: removes the password, ends sessions, cancels links, verifies", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: null } as never);

    await checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession });

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { passwordHash: null, passwordChangedAt: NOW, emailVerified: NOW },
    });
    expect(prismaMock.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: NOW },
    });
    expect(prismaMock.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: "u1", usedAt: null },
      data: { usedAt: NOW },
    });
  });

  it("stops the sign-in when that transaction fails, so Google is never linked to a live password", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "u1", emailVerified: null } as never);
    prismaMock.$transaction.mockRejectedValue(new Error("connection lost"));

    // The signIn callback rethrows this; Auth.js turns a throw into AccessDenied before it links
    // or creates anything (handleAuthorized runs before handleLoginOrRegister in @auth/core).
    await expect(
      checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession })
    ).rejects.toThrow("connection lost");
  });

  it("finds the existing user whatever the case or spacing of Google's email", async () => {
    await checkOAuthSignIn({
      account: google,
      profile: { email: " Ada@Example.COM ", email_verified: true },
      hasValidSession: noSession,
    });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "ada@example.com" } })
    );
  });

  it("skips the email checks when this Google account is already linked", async () => {
    prismaMock.account.findUnique.mockResolvedValue({ userId: "u1" } as never);

    await expect(
      checkOAuthSignIn({ account: google, profile: verifiedProfile, hasValidSession: noSession })
    ).resolves.toBe(true);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });
});
