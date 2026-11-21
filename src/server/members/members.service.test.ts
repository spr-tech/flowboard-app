// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockGroupBy, prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { listMembers } from "./members.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const myMembership = { role: "MEMBER", pinnedAt: null, lastOpenedAt: null, joinedAt: new Date() };

beforeEach(() => resetPrismaMock());

describe("listMembers", () => {
  it("lists everyone, owner first, with how many tasks each has in the project", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(myMembership as never);
    prismaMock.projectMember.findMany.mockResolvedValue([
      { role: "OWNER", user: { id: "u1", name: "Alex", email: "alex@example.com", image: null } },
      { role: "MEMBER", user: { id: "u2", name: "Sam", email: "sam@example.com", image: null } },
    ] as never);
    mockGroupBy(prismaMock.task.groupBy).mockResolvedValue([{ assigneeId: "u2", _count: { _all: 3 } }] as never);

    expect(await listMembers("u2", "p1")).toEqual([
      { id: "u1", name: "Alex", email: "alex@example.com", image: null, role: "OWNER", taskCount: 0 },
      { id: "u2", name: "Sam", email: "sam@example.com", image: null, role: "MEMBER", taskCount: 3 },
    ]);
    expect(prismaMock.projectMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: "p1" }, orderBy: [{ role: "asc" }, { joinedAt: "asc" }] })
    );
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(listMembers("stranger", "p1")).rejects.toMatchObject({ status: 404 });
    expect(prismaMock.projectMember.findMany).not.toHaveBeenCalled();
  });
});
