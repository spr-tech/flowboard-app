import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/stores/store";
import { projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { columnsService } from "./columnsService";
import { projectsService } from "./projectsService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

describe("columnsService", () => {
  it("sends each column write to its path and refetches the board afterwards", async () => {
    const calls: string[] = [];
    mockFetch(async (request) => {
      const path = new URL(request.url).pathname;
      const body = request.method === "GET" ? "" : ` ${await request.text()}`;
      calls.push(`${request.method} ${path}${body}`);
      return request.method === "GET" ? jsonResponse(200, projectDetail()) : jsonResponse(200, { id: "c9" });
    });
    const store = makeStore();
    const board = store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
    await board;

    await store.dispatch(columnsService.endpoints.createColumn.initiate({ projectId: "p1", name: "Review" }));
    await store.dispatch(
      columnsService.endpoints.updateColumn.initiate({ projectId: "p1", columnId: "c9", move: "left" })
    );
    await store.dispatch(
      columnsService.endpoints.deleteColumn.initiate({ projectId: "p1", columnId: "c9", moveTasksTo: "todo" })
    );

    await vi.waitFor(() =>
      expect(calls).toEqual([
        "GET /api/projects/p1",
        'POST /api/projects/p1/columns {"name":"Review"}',
        "GET /api/projects/p1",
        'PATCH /api/columns/c9 {"move":"left"}',
        "GET /api/projects/p1",
        'DELETE /api/columns/c9 {"moveTasksTo":"todo"}',
        "GET /api/projects/p1",
      ])
    );
    board.unsubscribe();
  });
});
