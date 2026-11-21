// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetColumnOrder, setColumnOrder } from "@/server/columns/columnOrder.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { DELETE, PUT } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/columns/columnOrder.service", () => ({ setColumnOrder: vi.fn(), resetColumnOrder: vi.fn() }));

const path = "/api/projects/p1/column-order";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u2"));

describe("/api/projects/:projectId/column-order", () => {
  it("PUT saves my order", async () => {
    vi.mocked(setColumnOrder).mockResolvedValue({ projectId: "p1", columnOrder: ["b", "a"] });

    const response = await PUT(jsonRequest(path, "PUT", { columnIds: ["b", "a"] }), params);

    expect(response.status).toBe(200);
    expect(setColumnOrder).toHaveBeenCalledWith("u2", "p1", ["b", "a"]);
  });

  it("PUT refuses a list with the same column twice, or no list", async () => {
    expect((await PUT(jsonRequest(path, "PUT", { columnIds: ["a", "a"] }), params)).status).toBe(400);
    expect((await PUT(jsonRequest(path, "PUT", {}), params)).status).toBe(400);
    expect(setColumnOrder).not.toHaveBeenCalled();
  });

  it("DELETE goes back to the team order", async () => {
    vi.mocked(resetColumnOrder).mockResolvedValue({ projectId: "p1", columnOrder: null });

    expect(await (await DELETE(jsonRequest(path, "DELETE"), params)).json()).toEqual({
      projectId: "p1",
      columnOrder: null,
    });
  });
});
