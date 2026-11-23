// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { prismaMock, resetPrismaMock } from "@/test/prismaMock";
import { activityPageQuerySchema } from "@/models/validations/dashboardValidation";
import { activityCursor, getTaskActivity, getTeamActivity } from "./activity.service";

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
  /** Rows a1 (newest) … aN, one minute apart. */
  const rows = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      ...row,
      id: `a${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 10, 23, 10, 59 - index)),
    }));

  it("the first page: 5 events from every project I'm in, newest first, and where the next page starts", async () => {
    prismaMock.activity.findMany.mockResolvedValue(rows(6) as never); // 5 plus one to know there's more

    const page = await getTeamActivity("me");

    expect(page.items.map((item) => item.id)).toEqual(["a1", "a2", "a3", "a4", "a5"]);
    expect(page.items[0]).toEqual({ ...row, id: "a1", createdAt: "2026-11-23T10:59:00.000Z" });
    expect(page.nextCursor).toBe("2026-11-23T10:55:00.000Z_a5");
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { project: { members: { some: { userId: "me" } } } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 6,
      })
    );
  });

  it("an older page starts after the cursor's row, ties broken by id", async () => {
    prismaMock.activity.findMany.mockResolvedValue(rows(2) as never);
    const { limit, cursor } = activityPageQuerySchema.parse({ cursor: "2026-11-23T10:55:00.000Z_a5" });

    const page = await getTeamActivity("me", { limit, cursor });

    const createdAt = new Date("2026-11-23T10:55:00.000Z");
    expect(prismaMock.activity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: { members: { some: { userId: "me" } } },
          OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { lt: "a5" } }],
        },
      })
    );
    expect(page.nextCursor).toBeNull(); // fewer than asked for: the end
  });

  it("the last page exactly full has no next cursor", async () => {
    prismaMock.activity.findMany.mockResolvedValue(rows(5) as never);
    expect((await getTeamActivity("me")).nextCursor).toBeNull();
  });

  it("treats a meta that isn't an object as none", async () => {
    prismaMock.activity.findMany.mockResolvedValue([{ ...row, meta: ["odd"] }] as never);

    expect((await getTeamActivity("me")).items[0].meta).toBeNull();
  });

  it("writes cursors the query schema reads back", () => {
    const cursor = activityCursor({ createdAt: new Date("2026-11-23T10:00:00.123Z"), id: "cmwabc123" });
    expect(activityPageQuerySchema.parse({ cursor }).cursor).toEqual({
      createdAt: new Date("2026-11-23T10:00:00.123Z"),
      id: "cmwabc123",
    });
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
