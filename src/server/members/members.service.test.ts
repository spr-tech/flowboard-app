// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockGroupBy, prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { listMembers, removeMember } from "./members.service";

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

describe("removeMember", () => {
  const owner = { ...myMembership, role: "OWNER" };

  it("unassigns their tasks in this project, removes them and writes member.removed, in one transaction", async () => {
    prismaMock.projectMember.findUnique
      .mockResolvedValueOnce(owner as never)
      .mockResolvedValueOnce({ role: "MEMBER", user: { name: "Ada Obi", email: "ada@team.dev" } } as never);
    prismaMock.task.updateMany.mockResolvedValue({ count: 3 });

    expect(await removeMember("owner", "p1", "ada")).toEqual({
      projectId: "p1",
      userId: "ada",
      unassignedTaskCount: 3,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.task.updateMany).toHaveBeenCalledWith({
      where: { projectId: "p1", assigneeId: "ada" },
      data: { assigneeId: null },
    });
    expect(prismaMock.projectMember.delete).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: "ada", projectId: "p1" } },
    });
    expect(prismaMock.activity.create).toHaveBeenCalledWith({
      data: {
        projectId: "p1",
        actorId: "owner",
        action: "member.removed",
        meta: { userId: "ada", name: "Ada Obi", unassignedTaskCount: 3 },
      },
    });
  });

  it("never removes the owner", async () => {
    prismaMock.projectMember.findUnique
      .mockResolvedValueOnce(owner as never)
      .mockResolvedValueOnce({ role: "OWNER", user: { name: "Alex", email: "demo@example.com" } } as never);

    await expect(removeMember("owner", "p1", "owner")).rejects.toMatchObject({
      status: 400,
      code: "CANNOT_REMOVE_OWNER",
    });
    expect(prismaMock.projectMember.delete).not.toHaveBeenCalled();
  });

  it("is owner only, and 404s for someone who isn't in the project", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValueOnce(myMembership as never);
    await expect(removeMember("sam", "p1", "ada")).rejects.toMatchObject({ status: 403 });

    prismaMock.projectMember.findUnique.mockResolvedValueOnce(owner as never).mockResolvedValueOnce(null);
    await expect(removeMember("owner", "p1", "nobody")).rejects.toMatchObject({
      status: 404,
      code: "MEMBER_NOT_FOUND",
    });
    expect(prismaMock.task.updateMany).not.toHaveBeenCalled();
  });
});
