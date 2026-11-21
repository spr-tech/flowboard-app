// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/server/lib/errors";
import { leaveProject } from "@/server/projects/projects.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/projects/projects.service", () => ({ leaveProject: vi.fn() }));

const path = "/api/projects/p1/leave";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u2"));

describe("POST /api/projects/:projectId/leave", () => {
  it("leaves and answers with how many tasks were unassigned", async () => {
    vi.mocked(leaveProject).mockResolvedValue({ projectId: "p1", unassignedTaskCount: 2 });

    const response = await POST(jsonRequest(path, "POST"), params);

    expect(await response.json()).toEqual({ projectId: "p1", unassignedTaskCount: 2 });
    expect(leaveProject).toHaveBeenCalledWith("u2", "p1");
  });

  it("passes the owner's 403 through", async () => {
    vi.mocked(leaveProject).mockRejectedValue(
      new ApiError(403, "OWNER_CANNOT_LEAVE", "Owners can't leave their own project. Delete it instead.")
    );

    const response = await POST(jsonRequest(path, "POST"), params);

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("OWNER_CANNOT_LEAVE");
  });
});
