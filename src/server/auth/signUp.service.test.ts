// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { register } from "@/server/auth/auth.service";
import { sendVerificationCode } from "@/server/auth/emailVerification.service";
import { hashToken } from "@/server/lib/secureToken";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { signUp } from "./signUp.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/auth/auth.service", () => ({ register: vi.fn() }));
vi.mock("@/server/auth/emailVerification.service", () => ({ sendVerificationCode: vi.fn() }));

const NOW = new Date("2026-11-23T12:00:00.000Z");
const input = { name: "Ada Okafor", email: "ada@team.dev", password: "correct-horse!" };
const user = { id: "u1", name: "Ada Okafor", email: "ada@team.dev" };
const liveInvite = {
  email: "ada@team.dev",
  expiresAt: new Date(NOW.getTime() + 60_000),
  acceptedAt: null,
  cancelledAt: null,
};

beforeEach(() => {
  resetPrismaMock();
  vi.useFakeTimers({ now: NOW });
  vi.mocked(register).mockResolvedValue(user);
  vi.mocked(sendVerificationCode).mockResolvedValue({} as never);
});
afterEach(() => vi.useRealTimers());

describe("signUp", () => {
  it("creates the account, then sends the code, and says to go to /verify-email", async () => {
    expect(await signUp(input)).toEqual({ ...user, needsEmailCode: true });
    expect(sendVerificationCode).toHaveBeenCalledWith("u1");
    expect(vi.mocked(register).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendVerificationCode).mock.invocationCallOrder[0]
    );
  });

  it("still succeeds if the email can't be sent: the verify page can send another", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(sendVerificationCode).mockRejectedValue(new Error("SMTP down"));

    expect(await signUp(input)).toEqual({ ...user, needsEmailCode: true });
  });

  it("sends no code for a sign-up from a live invite for this email", async () => {
    prismaMock.invite.findUnique.mockResolvedValue(liveInvite as never);

    expect(await signUp({ ...input, inviteToken: "tok" })).toEqual({ ...user, needsEmailCode: false });
    expect(prismaMock.invite.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tokenHash: hashToken("tok") } })
    );
    expect(sendVerificationCode).not.toHaveBeenCalled();
  });

  it.each([
    ["for another email", { email: "sam@team.dev" }],
    ["expired", { expiresAt: NOW }],
    ["already accepted", { acceptedAt: NOW }],
    ["cancelled", { cancelledAt: NOW }],
  ])("sends the code when the invite is %s", async (_label, change) => {
    prismaMock.invite.findUnique.mockResolvedValue({ ...liveInvite, ...change } as never);

    expect((await signUp({ ...input, inviteToken: "tok" })).needsEmailCode).toBe(true);
    expect(sendVerificationCode).toHaveBeenCalledWith("u1");
  });
});
