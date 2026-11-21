// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createProject, listProjects } from "@/server/projects/projects.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { GET, POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/projects/projects.service", () => ({ listProjects: vi.fn(), createProject: vi.fn() }));

beforeEach(() => signInAs("u1"));

describe("GET /api/projects", () => {
  it("lists my projects for the day the browser sends", async () => {
    vi.mocked(listProjects).mockResolvedValue([]);

    const response = await GET(jsonRequest("/api/projects?today=2026-11-21", "GET"), segment());

    expect(response.status).toBe(200);
    expect(listProjects).toHaveBeenCalledWith("u1", "2026-11-21");
  });

  it.each(["", "?today=21-11-2026", "?today=2026-02-30"])(
    "answers 400 for a missing or bad day: '%s'",
    async (query) => {
      const response = await GET(jsonRequest(`/api/projects${query}`, "GET"), segment());

      expect(response.status).toBe(400);
      expect(listProjects).not.toHaveBeenCalled();
    }
  );

  it("answers 401 when signed out", async () => {
    signInAs(null);

    expect((await GET(jsonRequest("/api/projects?today=2026-11-21", "GET"), segment())).status).toBe(401);
  });
});

describe("POST /api/projects", () => {
  it("creates the project with a trimmed name and answers 201", async () => {
    vi.mocked(createProject).mockResolvedValue({ id: "p9" } as never);

    const response = await POST(
      jsonRequest("/api/projects", "POST", { name: "  Mobile app ", colour: "teal" }),
      segment()
    );

    expect(response.status).toBe(201);
    expect(createProject).toHaveBeenCalledWith("u1", { name: "Mobile app", colour: "teal" });
  });

  it.each([
    [{ name: "", colour: "teal" }, "name"],
    [{ name: "x".repeat(61), colour: "teal" }, "name"],
    [{ name: "Mobile app", colour: "orange" }, "colour"],
  ])("answers 400 with a field message for %j", async (body, field) => {
    const response = await POST(jsonRequest("/api/projects", "POST", body), segment());

    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toHaveProperty(field);
    expect(createProject).not.toHaveBeenCalled();
  });
});
