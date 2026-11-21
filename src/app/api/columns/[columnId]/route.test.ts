// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteColumn, updateColumn } from "@/server/columns/columns.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { DELETE, PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/columns/columns.service", () => ({ updateColumn: vi.fn(), deleteColumn: vi.fn() }));

const path = "/api/columns/c1";
const params = segment({ columnId: "c1" });

beforeEach(() => signInAs("u1"));

describe("/api/columns/:columnId", () => {
  it("PATCH renames, moves or sets done", async () => {
    vi.mocked(updateColumn).mockResolvedValue({ id: "c1" } as never);

    await PATCH(jsonRequest(path, "PATCH", { move: "left" }), params);
    await PATCH(jsonRequest(path, "PATCH", { isDone: true }), params);

    expect(updateColumn).toHaveBeenNthCalledWith(1, "u1", "c1", { move: "left" });
    expect(updateColumn).toHaveBeenNthCalledWith(2, "u1", "c1", { isDone: true });
  });

  it("PATCH refuses isDone false (a done column is replaced, never unset) and empty bodies", async () => {
    expect((await PATCH(jsonRequest(path, "PATCH", { isDone: false }), params)).status).toBe(400);
    expect((await PATCH(jsonRequest(path, "PATCH", {}), params)).status).toBe(400);
  });

  it("DELETE takes either moveTasksTo or confirmName, not both and not neither", async () => {
    vi.mocked(deleteColumn).mockResolvedValue({ id: "c1" });

    expect((await DELETE(jsonRequest(path, "DELETE", { moveTasksTo: "c2" }), params)).status).toBe(200);
    expect((await DELETE(jsonRequest(path, "DELETE", { confirmName: "Review" }), params)).status).toBe(200);
    const both = jsonRequest(path, "DELETE", { moveTasksTo: "c2", confirmName: "x" });
    expect((await DELETE(both, params)).status).toBe(400);
    expect((await DELETE(jsonRequest(path, "DELETE", {}), params)).status).toBe(400);
    expect(deleteColumn).toHaveBeenCalledTimes(2);
  });
});
