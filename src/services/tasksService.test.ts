import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { makeStore } from "@/stores/store";
import { boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { projectsService } from "./projectsService";
import { tasksService } from "./tasksService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const NOW = new Date("2026-11-22T15:00:00Z");
type Store = ReturnType<typeof makeStore>;

const board = projectDetail({
  tasks: [
    boardTask("a", { position: 1000 }),
    boardTask("b", { position: 2000 }),
    boardTask("x", { columnId: "doing", position: 1000 }),
  ],
});

const cachedTask = (store: Store, id: string) =>
  projectsService.endpoints.getProject
    .select("p1")(store.getState())
    .data?.tasks.find((task) => task.id === id);

function deferred() {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
}

/** A store with the board cached; writes answer with `answer`. */
async function storeWithBoard(answer: (request: Request) => Response | Promise<Response>) {
  const fetchMock = mockFetch((request) =>
    request.method === "GET" && new URL(request.url).pathname === "/api/projects/p1"
      ? jsonResponse(200, board)
      : answer(request)
  );
  const store = makeStore();
  await store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  return { store, fetchMock };
}

describe("tasksService", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(toast).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  describe("moveTask (optimistic)", () => {
    it("moves the card in the cache before the server answers, then keeps the server's position", async () => {
      const response = deferred();
      const { store, fetchMock } = await storeWithBoard(() => response.promise);

      const move = store.dispatch(
        tasksService.endpoints.moveTask.initiate({
          projectId: "p1",
          taskId: "x",
          columnId: "todo",
          afterTaskId: "a",
          beforeTaskId: "b",
        })
      );

      expect(cachedTask(store, "x")).toMatchObject({ columnId: "todo", position: 1500, completedAt: null });

      response.resolve(jsonResponse(200, boardTask("x", { columnId: "todo", position: 1499.5 })));
      await move;

      expect(cachedTask(store, "x")?.position).toBe(1499.5);
      const request = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "PATCH");
      expect(new URL(request?.url ?? "").pathname).toBe("/api/tasks/x/move");
      expect(await request?.json()).toEqual({ columnId: "todo", afterTaskId: "a", beforeTaskId: "b" });
    });

    it("guesses completedAt moving into Done, and takes the server's on success", async () => {
      const response = deferred();
      const { store } = await storeWithBoard(() => response.promise);

      const move = store.dispatch(
        tasksService.endpoints.moveTask.initiate({ projectId: "p1", taskId: "a", columnId: "done" })
      );
      expect(cachedTask(store, "a")?.completedAt).toBe(NOW.toISOString());

      response.resolve(
        jsonResponse(200, boardTask("a", { columnId: "done", completedAt: "2026-11-22T15:00:01.000Z" }))
      );
      await move;
      expect(cachedTask(store, "a")?.completedAt).toBe("2026-11-22T15:00:01.000Z");
    });

    it("puts the card back and shows the error toast when the move fails", async () => {
      const response = deferred();
      const { store } = await storeWithBoard(() => response.promise);

      const move = store.dispatch(
        tasksService.endpoints.moveTask.initiate({ projectId: "p1", taskId: "x", columnId: "todo", beforeTaskId: "a" })
      );
      expect(cachedTask(store, "x")?.columnId).toBe("todo");

      response.resolve(jsonResponse(400, { error: { code: "INVALID_POSITION", message: "The board changed." } }));
      await move;

      expect(cachedTask(store, "x")).toMatchObject({ columnId: "doing", position: 1000 });
      expect(toast).toHaveBeenCalledWith({
        type: "error",
        message: "The board changed.",
        id: "error:INVALID_POSITION",
      });
    });
  });

  it("createTask adds the server's task to the board", async () => {
    const { store } = await storeWithBoard(() => jsonResponse(201, boardTask("new", { position: 3000 })));

    await store.dispatch(
      tasksService.endpoints.createTask.initiate({ projectId: "p1", title: "New", columnId: "todo" })
    );

    expect(cachedTask(store, "new")?.position).toBe(3000);
  });

  it("updateTask replaces the task with the server's version, without sending projectId", async () => {
    const { store, fetchMock } = await storeWithBoard(() => jsonResponse(200, boardTask("a", { priority: "HIGH" })));

    await store.dispatch(
      tasksService.endpoints.updateTask.initiate({ projectId: "p1", taskId: "a", priority: "HIGH" })
    );

    expect(cachedTask(store, "a")?.priority).toBe("HIGH");
    const request = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "PATCH");
    expect(await request?.json()).toEqual({ priority: "HIGH" });
  });

  it("deleteTask removes the task from the board once the server confirms", async () => {
    const { store } = await storeWithBoard(() => jsonResponse(200, { id: "a" }));

    await store.dispatch(tasksService.endpoints.deleteTask.initiate({ projectId: "p1", taskId: "a" }));

    expect(cachedTask(store, "a")).toBeUndefined();
  });
});
