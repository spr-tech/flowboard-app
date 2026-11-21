// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createTask } from "@/server/tasks/tasks.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { POST } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/tasks/tasks.service", () => ({ createTask: vi.fn() }));

const path = "/api/projects/p1/tasks";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u2"));

describe("POST /api/projects/:projectId/tasks", () => {
  it("creates a task (201) with the trimmed title", async () => {
    vi.mocked(createTask).mockResolvedValue({ id: "t9" } as never);

    const response = await POST(jsonRequest(path, "POST", { title: "  Fix login ", columnId: "c1" }), params);

    expect(response.status).toBe(201);
    expect(createTask).toHaveBeenCalledWith("u2", "p1", { title: "Fix login", columnId: "c1" });
  });

  it("refuses a blank title with a field error", async () => {
    const response = await POST(jsonRequest(path, "POST", { title: "  ", columnId: "c1" }), params);

    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toHaveProperty("title");
  });
});
