import { describe, expect, it } from "vitest";

import { makeStore } from "@/stores/store";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { membersService } from "./membersService";

describe("membersService", () => {
  it("lists a project's members from /api/projects/:projectId/members", async () => {
    const members = [{ id: "u1", name: "Ada", email: "ada@example.com", image: null, role: "OWNER", taskCount: 2 }];
    const fetchMock = mockFetch(() => jsonResponse(200, members));
    const store = makeStore();

    const result = await store.dispatch(membersService.endpoints.listMembers.initiate("p1"));

    expect(result.data).toEqual(members);
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/projects/p1/members");
  });
});
