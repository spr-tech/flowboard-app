// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listMembers } from "@/server/members/members.service";
import { jsonRequest, segment, signInAs } from "@/test/routeTestHelpers";
import { GET } from "./route";

vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/server/members/members.service", () => ({ listMembers: vi.fn() }));

const path = "/api/projects/p1/members";
const params = segment({ projectId: "p1" });

beforeEach(() => signInAs("u2"));

describe("GET /api/projects/:projectId/members", () => {
  it("answers with the members", async () => {
    vi.mocked(listMembers).mockResolvedValue([]);

    const response = await GET(jsonRequest(path, "GET"), params);

    expect(response.status).toBe(200);
    expect(listMembers).toHaveBeenCalledWith("u2", "p1");
  });

  it("answers 401 when signed out", async () => {
    signInAs(null);

    expect((await GET(jsonRequest(path, "GET"), params)).status).toBe(401);
    expect(listMembers).not.toHaveBeenCalled();
  });
});
