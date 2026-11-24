// @vitest-environment node
// Who may invite: the owner, and managers with inviteMembers. Everyone else gets 403.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { createInvite } from "./invites.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());
vi.mock("@/server/lib/email", () => ({ sendEmail: vi.fn() }));
const { sendEmail } = await import("@/server/lib/email");

const member = { role: "MEMBER", permissions: null, pinnedAt: null, lastOpenedAt: null, joinedAt: new Date() };

beforeEach(() => {
  resetPrismaMock();
  vi.mocked(sendEmail).mockReset();
});

describe("createInvite: who may invite", () => {
  it("refuses members and managers without inviteMembers; lets a manager with it through", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(member as never);
    await expect(createInvite("sam", "p1", "ada@team.dev")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN",
      message: "Only the owner, or a manager allowed to, can invite people.",
    });

    prismaMock.projectMember.findUnique.mockResolvedValueOnce({
      ...member,
      role: "MANAGER",
      permissions: { inviteMembers: false },
    } as never);
    await expect(createInvite("kim", "p1", "ada@team.dev")).rejects.toMatchObject({ status: 403 });

    // With the switch on, the manager gets past the permission check (here to the email check).
    prismaMock.projectMember.findUnique.mockResolvedValueOnce({
      ...member,
      role: "MANAGER",
      permissions: { inviteMembers: true },
    } as never);
    prismaMock.user.findUnique.mockResolvedValueOnce({ emailVerified: null } as never);
    await expect(createInvite("kim", "p1", "ada@team.dev")).rejects.toMatchObject({ code: "EMAIL_NOT_VERIFIED" });

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
