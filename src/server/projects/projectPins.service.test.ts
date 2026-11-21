// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { pinProject, recordVisit, unpinProject, VISIT_WRITE_INTERVAL_MS } from "./projectPins.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const joinedAt = new Date("2026-11-01T09:00:00Z");
const membership = { role: "MEMBER", pinnedAt: null, lastOpenedAt: null, joinedAt } as const;
const now = new Date("2026-11-21T12:00:00Z");

beforeEach(() => resetPrismaMock());

describe("pinProject", () => {
  it("lets any member pin, and answers with the updated membership", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(membership as never);
    prismaMock.projectMember.update.mockResolvedValue({ ...membership, pinnedAt: now } as never);

    const result = await pinProject("u2", "p1", now);

    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_projectId: { userId: "u2", projectId: "p1" } },
        data: { pinnedAt: now },
      })
    );
    expect(result).toEqual({
      projectId: "p1",
      role: "MEMBER",
      pinnedAt: now.toISOString(),
      lastOpenedAt: null,
      joinedAt: joinedAt.toISOString(),
    });
  });

  it("keeps the first pin's time when pinned again, so the pin order doesn't change", async () => {
    const pinnedAt = new Date("2026-11-02T00:00:00Z");
    prismaMock.projectMember.findUnique.mockResolvedValue({ ...membership, pinnedAt } as never);

    const result = await pinProject("u2", "p1", now);

    expect(prismaMock.projectMember.update).not.toHaveBeenCalled();
    expect(result.pinnedAt).toBe(pinnedAt.toISOString());
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(pinProject("stranger", "p1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("unpinProject", () => {
  it("clears my pin", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue({ ...membership, pinnedAt: now } as never);
    prismaMock.projectMember.update.mockResolvedValue(membership as never);

    const result = await unpinProject("u2", "p1");

    expect(prismaMock.projectMember.update).toHaveBeenCalledWith(expect.objectContaining({ data: { pinnedAt: null } }));
    expect(result.pinnedAt).toBeNull();
  });

  it("answers 404 to a non-member", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(unpinProject("stranger", "p1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("recordVisit", () => {
  it("writes only when never opened or last opened at least a minute ago, in one conditional write", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 1 });

    expect(await recordVisit(prismaMock, "u1", "p1", now)).toBe(true);
    expect(prismaMock.projectMember.updateMany).toHaveBeenCalledWith({
      where: {
        userId: "u1",
        projectId: "p1",
        OR: [{ lastOpenedAt: null }, { lastOpenedAt: { lte: new Date(now.getTime() - VISIT_WRITE_INTERVAL_MS) } }],
      },
      data: { lastOpenedAt: now },
    });
    expect(prismaMock.projectMember.findUnique).not.toHaveBeenCalled();
  });

  it("reports no write when the last visit was within the minute (the condition matched no row)", async () => {
    prismaMock.projectMember.updateMany.mockResolvedValue({ count: 0 });

    expect(await recordVisit(prismaMock, "u1", "p1", now)).toBe(false);
  });

  it("uses a one-minute window", () => {
    expect(VISIT_WRITE_INTERVAL_MS).toBe(60_000);
  });
});
