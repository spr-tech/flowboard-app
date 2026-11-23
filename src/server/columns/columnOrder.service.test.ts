// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Prisma } from "@/lib/generated/prisma";
import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { resetColumnOrder, setColumnOrder } from "./columnOrder.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const NOW = new Date("2026-11-22T10:00:00Z");
const member = { role: "MEMBER", pinnedAt: null, lastOpenedAt: null, joinedAt: NOW } as const;

beforeEach(() => resetPrismaMock());

describe("setColumnOrder", () => {
  it("saves a member's own order, writing no Activity row", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);
    prismaMock.column.count.mockResolvedValue(3);

    expect(await setColumnOrder("sam", "p1", ["review", "todo", "done"])).toEqual({
      projectId: "p1",
      columnOrder: ["review", "todo", "done"],
    });
    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_projectId: { userId: "sam", projectId: "p1" } },
        data: { columnOrder: ["review", "todo", "done"] },
      })
    );
    expect(prismaMock.activity.create).not.toHaveBeenCalled();
  });

  it("refuses ids that aren't this project's columns", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);
    prismaMock.column.count.mockResolvedValue(1);

    await expect(setColumnOrder("sam", "p1", ["todo", "elsewhere"])).rejects.toMatchObject({
      status: 400,
      code: "UNKNOWN_COLUMN",
    });
    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
  });

  it("refuses the owner, whose moves change the team order instead", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue({ ...member, role: "OWNER" } as never);
    await expect(setColumnOrder("demo", "p1", ["todo"])).rejects.toMatchObject({ code: "OWNER_USES_TEAM_ORDER" });
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    await expect(setColumnOrder("stranger", "p1", ["todo"])).rejects.toMatchObject({ status: 404 });
  });
});

describe("resetColumnOrder", () => {
  it("stores SQL NULL, meaning follow the team order", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(member as never);

    expect(await resetColumnOrder("sam", "p1")).toEqual({ projectId: "p1", columnOrder: null });
    expect(prismaMock.projectMember.update.mock.calls[0][0].data).toEqual({ columnOrder: Prisma.DbNull });
  });
});
