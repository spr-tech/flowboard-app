import { describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { makeStore } from "@/stores/store";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { columnsService } from "./columnsService";
import { projectsService } from "./projectsService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

type Store = ReturnType<typeof makeStore>;
const board = (store: Store) => projectsService.endpoints.getProject.select("p1")(store.getState()).data;
const columnIds = (store: Store) => board(store)?.columns.map((column) => column.id);

function deferred() {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
}

async function storeWithBoard(answer: (request: Request) => Response | Promise<Response>, detail = projectDetail()) {
  const calls: string[] = [];
  mockFetch(async (request) => {
    const path = new URL(request.url).pathname;
    const body = request.method === "GET" ? "" : ` ${await request.clone().text()}`;
    calls.push(`${request.method} ${path}${body}`);
    return request.method === "GET" ? jsonResponse(200, detail) : answer(request);
  });
  const store = makeStore();
  const subscription = store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  await subscription;
  return { store, calls, subscription };
}

describe("columnsService", () => {
  it("create, rename and delete wait for the server, then the board refetches", async () => {
    const { store, calls, subscription } = await storeWithBoard(() => jsonResponse(200, { id: "c9" }));

    await store.dispatch(columnsService.endpoints.createColumn.initiate({ projectId: "p1", name: "Review" }));
    await store.dispatch(
      columnsService.endpoints.updateColumn.initiate({ projectId: "p1", columnId: "c9", name: "QA" })
    );
    await store.dispatch(
      columnsService.endpoints.deleteColumn.initiate({ projectId: "p1", columnId: "c9", moveTasksTo: "todo" })
    );

    await vi.waitFor(() =>
      expect(calls).toEqual([
        "GET /api/projects/p1",
        'POST /api/projects/p1/columns {"name":"Review"}',
        "GET /api/projects/p1",
        'PATCH /api/columns/c9 {"name":"QA"}',
        "GET /api/projects/p1",
        'DELETE /api/columns/c9 {"moveTasksTo":"todo"}',
        "GET /api/projects/p1",
      ])
    );
    subscription.unsubscribe();
  });

  describe("moveColumn (team order, optimistic)", () => {
    it("moves the column at once, then keeps the server's position", async () => {
      const response = deferred();
      const { store, calls } = await storeWithBoard(() => response.promise);

      const move = store.dispatch(
        columnsService.endpoints.moveColumn.initiate({ projectId: "p1", columnId: "done", beforeColumnId: "todo" })
      );
      expect(columnIds(store)).toEqual(["done", "todo", "doing"]);

      response.resolve(jsonResponse(200, { id: "done", position: -500 }));
      await move;
      expect(board(store)?.columns[0]).toMatchObject({ id: "done", position: -500 });
      expect(calls).toContain('PATCH /api/columns/done/move {"beforeColumnId":"todo"}');
    });

    it("puts the column back and shows the error toast when the move fails", async () => {
      const response = deferred();
      const { store } = await storeWithBoard(() => response.promise);

      const move = store.dispatch(
        columnsService.endpoints.moveColumn.initiate({ projectId: "p1", columnId: "done", beforeColumnId: "todo" })
      );
      expect(columnIds(store)?.[0]).toBe("done");

      response.resolve(
        jsonResponse(403, { error: { code: "OWNER_ONLY", message: "Only the project owner can do that." } })
      );
      await move;
      expect(columnIds(store)).toEqual(["todo", "doing", "done"]);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error", id: "error:OWNER_ONLY" }));
    });
  });

  describe("personal order (optimistic)", () => {
    const memberBoard = projectDetail({ me: boardMembership({ role: "MEMBER" }) });

    it("sets my order at once, and keeps it when the server agrees", async () => {
      const { store, calls } = await storeWithBoard(
        () => jsonResponse(200, { projectId: "p1", columnOrder: ["done", "todo", "doing"] }),
        memberBoard
      );

      const save = store.dispatch(
        columnsService.endpoints.setColumnOrder.initiate({ projectId: "p1", columnIds: ["done", "todo", "doing"] })
      );
      expect(board(store)?.me.columnOrder).toEqual(["done", "todo", "doing"]);
      await save;

      expect(board(store)?.me.columnOrder).toEqual(["done", "todo", "doing"]);
      // Only my view: the team order (positions) is untouched.
      expect(columnIds(store)).toEqual(["todo", "doing", "done"]);
      expect(calls).toContain('PUT /api/projects/p1/column-order {"columnIds":["done","todo","doing"]}');
    });

    it("undoes my order when saving it fails", async () => {
      const { store } = await storeWithBoard(
        () => jsonResponse(400, { error: { code: "UNKNOWN_COLUMN", message: "Refresh and try again." } }),
        memberBoard
      );

      await store.dispatch(
        columnsService.endpoints.setColumnOrder.initiate({ projectId: "p1", columnIds: ["done", "todo", "doing"] })
      );

      expect(board(store)?.me.columnOrder).toBeNull();
    });

    it("reset goes back to the team order", async () => {
      const { store } = await storeWithBoard(
        () => jsonResponse(200, { projectId: "p1", columnOrder: null }),
        projectDetail({ me: boardMembership({ role: "MEMBER", columnOrder: ["done", "todo", "doing"] }) })
      );

      await store.dispatch(columnsService.endpoints.resetColumnOrder.initiate("p1"));

      expect(board(store)?.me.columnOrder).toBeNull();
    });
  });
});
