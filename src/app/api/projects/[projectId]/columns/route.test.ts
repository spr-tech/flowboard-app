// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createColumn } from "@/server/columns/columns.service";
import { ApiError } from "@/server/lib/errors";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/columns/columns.service", () => ({ createColumn: vi.fn() }));

const path = "/api/projects/p1/columns";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u1"));

describe("POST /api/projects/:projectId/columns", () => {
  it("creates a column (201)", async () => {
    vi.mocked(createColumn).mockResolvedValue({ id: "c9", name: "Review" } as never);

    const response = await POST(jsonRequest(path, "POST", { name: "Review" }), params);

    expect(response.status).toBe(201);
    expect(createColumn).toHaveBeenCalledWith("u1", "p1", { name: "Review" });
  });

  it("refuses names over 40 characters, and passes on the service's 403 for members", async () => {
    expect((await POST(jsonRequest(path, "POST", { name: "x".repeat(41) }), params)).status).toBe(400);

    vi.mocked(createColumn).mockRejectedValue(new ApiError(403, "OWNER_ONLY", "Only the project owner can do that."));
    const response = await POST(jsonRequest(path, "POST", { name: "Review" }), params);
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("OWNER_ONLY");
  });
});
