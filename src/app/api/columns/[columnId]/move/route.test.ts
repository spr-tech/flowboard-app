// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { moveColumn } from "@/server/columns/columns.service";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/columns/columns.service", () => ({ moveColumn: vi.fn() }));

const path = "/api/columns/c1/move";
const params = segment({ columnId: "c1" });

beforeEach(() => signInAs("u1"));

describe("PATCH /api/columns/:columnId/move", () => {
  it("passes the neighbours to the service, and drops any position the browser sends", async () => {
    vi.mocked(moveColumn).mockResolvedValue({ id: "c1", position: 1500 } as never);

    const response = await PATCH(
      jsonRequest(path, "PATCH", { afterColumnId: "a", beforeColumnId: "b", position: 9 }),
      params
    );

    expect(response.status).toBe(200);
    expect(moveColumn).toHaveBeenCalledWith("u1", "c1", { afterColumnId: "a", beforeColumnId: "b" });
  });

  it("passes on 403 for a member (the team order is the owner's)", async () => {
    vi.mocked(moveColumn).mockRejectedValue(new ApiError(403, "OWNER_ONLY", "Only the project owner can do that."));

    expect((await PATCH(jsonRequest(path, "PATCH", { beforeColumnId: "b" }), params)).status).toBe(403);
  });
});
