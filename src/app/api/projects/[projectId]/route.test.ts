// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/server/lib/errors";
import { deleteProject, getProject, updateProject } from "@/server/projects/projects.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { DELETE, GET, PATCH } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/projects/projects.service", () => ({
  getProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
}));

const path = "/api/projects/p1";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u1"));

describe("GET /api/projects/:projectId", () => {
  it("answers with the project", async () => {
    vi.mocked(getProject).mockResolvedValue({ id: "p1" } as never);

    const response = await GET(jsonRequest(path, "GET"), params);

    expect(response.status).toBe(200);
    expect(getProject).toHaveBeenCalledWith("u1", "p1");
  });

  it("passes the service's 404 through in our error shape", async () => {
    vi.mocked(getProject).mockRejectedValue(new ApiError(404, "PROJECT_NOT_FOUND", "We couldn't find that project."));

    const response = await GET(jsonRequest(path, "GET"), params);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." },
    });
  });
});

describe("PATCH /api/projects/:projectId", () => {
  it("sends only the fields given", async () => {
    vi.mocked(updateProject).mockResolvedValue({ id: "p1" } as never);

    const response = await PATCH(jsonRequest(path, "PATCH", { colour: "plum" }), params);

    expect(response.status).toBe(200);
    expect(updateProject).toHaveBeenCalledWith("u1", "p1", { colour: "plum" });
  });

  it("answers 400 when nothing is sent", async () => {
    const response = await PATCH(jsonRequest(path, "PATCH", {}), params);

    expect(response.status).toBe(400);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("passes the 403 for members through", async () => {
    vi.mocked(updateProject).mockRejectedValue(new ApiError(403, "OWNER_ONLY", "Only the project owner can do that."));

    expect((await PATCH(jsonRequest(path, "PATCH", { name: "X" }), params)).status).toBe(403);
  });
});

describe("DELETE /api/projects/:projectId", () => {
  it("passes the typed name to the service", async () => {
    vi.mocked(deleteProject).mockResolvedValue({ id: "p1" });

    const response = await DELETE(jsonRequest(path, "DELETE", { name: "Website relaunch" }), params);

    expect(await response.json()).toEqual({ id: "p1" });
    expect(deleteProject).toHaveBeenCalledWith("u1", "p1", "Website relaunch");
  });

  it("answers 400 without a typed name", async () => {
    const response = await DELETE(jsonRequest(path, "DELETE", {}), params);

    expect(response.status).toBe(400);
    expect(deleteProject).not.toHaveBeenCalled();
  });
});
