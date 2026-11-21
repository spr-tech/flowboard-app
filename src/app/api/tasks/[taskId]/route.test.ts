// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/server/lib/errors";
import { deleteTask, updateTask } from "@/server/tasks/tasks.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { DELETE, PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/tasks/tasks.service", () => ({ updateTask: vi.fn(), deleteTask: vi.fn() }));

const path = "/api/tasks/t1";
const params = segment({ taskId: "t1" });

beforeEach(() => signInAs("u2"));

describe("/api/tasks/:taskId", () => {
  it("PATCH passes only the given fields to the service, for any member", async () => {
    vi.mocked(updateTask).mockResolvedValue({ id: "t1" } as never);

    const response = await PATCH(jsonRequest(path, "PATCH", { priority: "HIGH", dueDate: null }), params);

    expect(response.status).toBe(200);
    expect(updateTask).toHaveBeenCalledWith("u2", "t1", { priority: "HIGH", dueDate: null });
  });

  it("PATCH refuses an empty change or a date that doesn't exist with 400", async () => {
    expect((await PATCH(jsonRequest(path, "PATCH", {}), params)).status).toBe(400);
    expect((await PATCH(jsonRequest(path, "PATCH", { dueDate: "2026-02-30" }), params)).status).toBe(400);
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("DELETE deletes, and a task outside my projects is 404", async () => {
    vi.mocked(deleteTask).mockResolvedValueOnce({ id: "t1" });
    expect(await (await DELETE(jsonRequest(path, "DELETE"), params)).json()).toEqual({ id: "t1" });

    vi.mocked(deleteTask).mockRejectedValueOnce(new ApiError(404, "TASK_NOT_FOUND", "We couldn't find that task."));
    expect((await DELETE(jsonRequest(path, "DELETE"), params)).status).toBe(404);
  });

  it("answers 401 when signed out", async () => {
    signInAs(null);
    expect((await DELETE(jsonRequest(path, "DELETE"), params)).status).toBe(401);
  });
});
