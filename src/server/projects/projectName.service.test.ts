// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { findProjectName } from "./projectName.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

beforeEach(() => resetPrismaMock());

describe("findProjectName", () => {
  it("looks the project up through my membership", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue({ project: { name: "Website relaunch" } } as never);

    await expect(findProjectName("u1", "p1")).resolves.toBe("Website relaunch");
    expect(prismaMock.projectMember.findUnique).toHaveBeenCalledWith({
      where: { userId_projectId: { userId: "u1", projectId: "p1" } },
      select: { project: { select: { name: true } } },
    });
  });

  it("returns null when I'm not a member or the project is gone", async () => {
    prismaMock.projectMember.findUnique.mockResolvedValue(null);
    await expect(findProjectName("u1", "missing")).resolves.toBeNull();
  });
});
