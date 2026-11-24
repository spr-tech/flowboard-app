// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/server/lib/errors";
import { pinProject, unpinProject } from "@/server/projects/projectPins.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { DELETE, POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/projects/projectPins.service", () => ({ pinProject: vi.fn(), unpinProject: vi.fn() }));

const membership = {
  projectId: "p1",
  role: "MEMBER" as const,
  permissions: null,
  pinnedAt: "2026-11-21T12:00:00.000Z",
  lastOpenedAt: null,
  joinedAt: "2026-11-01T09:00:00.000Z",
};
const path = "/api/projects/p1/pin";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u2"));

describe("/api/projects/:projectId/pin", () => {
  it("POST pins for me and answers with my membership", async () => {
    vi.mocked(pinProject).mockResolvedValue(membership);

    const response = await POST(jsonRequest(path, "POST"), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(membership);
    expect(pinProject).toHaveBeenCalledWith("u2", "p1");
  });

  it("DELETE unpins for me", async () => {
    vi.mocked(unpinProject).mockResolvedValue({ ...membership, pinnedAt: null });

    const response = await DELETE(jsonRequest(path, "DELETE"), params);

    expect((await response.json()).pinnedAt).toBeNull();
    expect(unpinProject).toHaveBeenCalledWith("u2", "p1");
  });

  it("passes the 404 for non-members through", async () => {
    vi.mocked(pinProject).mockRejectedValue(new ApiError(404, "PROJECT_NOT_FOUND", "We couldn't find that project."));

    expect((await POST(jsonRequest(path, "POST"), params)).status).toBe(404);
  });

  it("answers 401 when signed out", async () => {
    signInAs(null);

    expect((await POST(jsonRequest(path, "POST"), params)).status).toBe(401);
    expect(pinProject).not.toHaveBeenCalled();
  });
});
