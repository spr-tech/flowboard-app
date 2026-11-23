// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { moveTask } from "@/server/tasks/taskMove.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/tasks/taskMove.service", () => ({ moveTask: vi.fn() }));

const path = "/api/tasks/t1/move";
const params = segment({ taskId: "t1" });

beforeEach(() => signInAs("u2"));

describe("PATCH /api/tasks/:taskId/move", () => {
  it("passes the column and neighbours to the service, and drops any position the browser sends", async () => {
    vi.mocked(moveTask).mockResolvedValue({ id: "t1", position: 1500 } as never);

    const response = await PATCH(
      jsonRequest(path, "PATCH", { columnId: "c2", afterTaskId: "a", beforeTaskId: "b", position: 99 }),
      params
    );

    expect(response.status).toBe(200);
    expect(moveTask).toHaveBeenCalledWith("u2", "t1", { columnId: "c2", afterTaskId: "a", beforeTaskId: "b" });
  });

  it("needs a column", async () => {
    expect((await PATCH(jsonRequest(path, "PATCH", { afterTaskId: "a" }), params)).status).toBe(400);
  });
});
