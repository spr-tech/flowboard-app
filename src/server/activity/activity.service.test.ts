// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { getTaskActivity, getTeamActivity } from "./activity.service";

vi.mock("@/server/lib/prisma", async () => (await import("@/test/prismaMock")).prismaModule());

const row = {
  id: "a1",
  action: "task.moved",
  meta: { title: "Fix sign-in", from: "To do", to: "In progress" },
  createdAt: new Date("2026-11-23T10:00:00Z"),
  actor: { id: "ada", name: "Ada", image: null },
  project: { id: "p1", name: "Website relaunch", colour: "lime" },
  task: { id: "t1", title: "Fix sign-in" },
};

beforeEach(() => resetPrismaMock());

describe("getTeamActivity", () => {
  it("lists the newest 20 events from every project I'm in", async () => {
    prismaMock.activity.findMany.mockResolvedValue([row] as never);

    expect(await getTeamActivity("me")).toEqual([{ ...row, createdAt: "2026-11-23T10:00:00.000Z" }]);
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { project: { members: { some: { userId: "me" } } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
    );
  });

  it("treats a meta that isn't an object as none", async () => {
    prismaMock.activity.findMany.mockResolvedValue([{ ...row, meta: ["odd"] }] as never);

    expect((await getTeamActivity("me"))[0].meta).toBeNull();
  });
});

describe("getTaskActivity", () => {
  it("lists one task's events for a member", async () => {
    prismaMock.task.findUnique.mockResolvedValue({ projectId: "p1" } as never);
    prismaMock.projectMember.findUnique.mockResolvedValue({ role: "MEMBER" } as never);
    prismaMock.activity.findMany.mockResolvedValue([row] as never);

    expect(await getTaskActivity("me", "t1")).toHaveLength(1);
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { taskId: "t1" } }));
  });

  it("answers 404 for a task in a project I'm not in", async () => {
    prismaMock.task.findUnique.mockResolvedValue({ projectId: "p1" } as never);
    prismaMock.projectMember.findUnique.mockResolvedValue(null);

    await expect(getTaskActivity("stranger", "t1")).rejects.toMatchObject({ status: 404, code: "TASK_NOT_FOUND" });
    expect(prismaMock.activity.findMany).not.toHaveBeenCalled();
  });
});
