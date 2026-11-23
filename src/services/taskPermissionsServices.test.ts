// The endpoints added for task permissions: personal moves, Assign to me, the "New" badge, my card
// order, notes, and roles. Each checks the request and what happens to the cached board.
import { describe, expect, it, vi } from "vitest";

import { makeStore } from "@/stores/store";
import { boardMembership, boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { columnsService } from "./columnsService";
import { membersService } from "./membersService";
import { notesService } from "./notesService";
import { projectsService } from "./projectsService";
import { tasksService } from "./tasksService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

type Store = ReturnType<typeof makeStore>;

const sam = { id: "sam", name: "Sam Rivera", image: null };
const board = projectDetail({
  me: boardMembership({ role: "MEMBER", cardOrder: { doing: ["c", "a"] }, takenOpenCount: 1 }),
  tasks: [
    boardTask("t1", { columnId: "todo", assignee: sam, takenFromPool: true }),
    boardTask("a", { columnId: "doing", position: 1000 }),
    boardTask("c", { columnId: "doing", position: 2000 }),
    boardTask("n", { columnId: "todo", position: 3000, newForOwner: true }),
  ],
});

async function storeWithBoard(answer: (request: Request) => Response | Promise<Response>) {
  const fetchMock = mockFetch((request) =>
    request.method === "GET" && new URL(request.url).pathname === "/api/projects/p1"
      ? jsonResponse(200, board)
      : answer(request)
  );
  const store = makeStore();
  await store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  const writes = () => fetchMock.mock.calls.map(([r]) => r as Request).filter((r) => r.method !== "GET");
  return { store, writes };
}

const cached = (store: Store) => projectsService.endpoints.getProject.select("p1")(store.getState()).data;

describe("moveTask for a personal mover", () => {
  it("puts the card where I dropped it in my order and at the top of the team order, sending only the neighbours", async () => {
    let release: (response: Response) => void = () => {};
    const { store, writes } = await storeWithBoard(() => new Promise<Response>((resolve) => (release = resolve)));

    const move = store.dispatch(
      tasksService.endpoints.moveTask.initiate({
        projectId: "p1",
        taskId: "t1",
        columnId: "doing",
        afterTaskId: "c",
        beforeTaskId: "a",
        personal: true,
        meId: "sam",
      })
    );

    const view = cached(store);
    expect(view?.me.cardOrder).toEqual({ doing: ["c", "t1", "a"] });
    expect(view?.tasks.find((task) => task.id === "t1")).toMatchObject({ columnId: "doing", position: 0 });
    await vi.waitFor(() => expect(writes()).toHaveLength(1));
    expect(await writes()[0].json()).toEqual({ columnId: "doing", afterTaskId: "c", beforeTaskId: "a" });

    release(jsonResponse(200, boardTask("t1", { columnId: "doing", position: 0, assignee: sam })));
    await move;
  });

  it("lowers my take count when I move a taken task into the done column, and undoes it all on failure", async () => {
    const { store } = await storeWithBoard(() =>
      jsonResponse(403, { error: { code: "TASK_FORBIDDEN", message: "No" } })
    );

    const move = store.dispatch(
      tasksService.endpoints.moveTask.initiate({
        projectId: "p1",
        taskId: "t1",
        columnId: "done",
        personal: true,
        meId: "sam",
      })
    );
    expect(cached(store)?.me.takenOpenCount).toBe(0);

    await move;
    expect(cached(store)?.me.takenOpenCount).toBe(1);
    expect(cached(store)?.me.cardOrder).toEqual({ doing: ["c", "a"] });
    expect(cached(store)?.tasks.find((task) => task.id === "t1")?.columnId).toBe("todo");
  });
});

describe("takeTask and markTaskSeen", () => {
  it("Assign to me waits for the server, then shows the task as mine and counts it", async () => {
    const { store, writes } = await storeWithBoard(() =>
      jsonResponse(200, boardTask("n", { columnId: "todo", position: 3000, assignee: sam, takenFromPool: true }))
    );

    const take = store.dispatch(tasksService.endpoints.takeTask.initiate({ projectId: "p1", taskId: "n" }));
    expect(cached(store)?.tasks.find((task) => task.id === "n")?.assignee).toBeNull();
    await take;

    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/n/take");
    expect(cached(store)?.tasks.find((task) => task.id === "n")?.assignee).toEqual(sam);
    expect(cached(store)?.me.takenOpenCount).toBe(2);
  });

  it("leaves the board alone when the take limit refuses", async () => {
    const { store } = await storeWithBoard(() =>
      jsonResponse(409, { error: { code: "TAKE_LIMIT_REACHED", message: "You've taken 5 open tasks." } })
    );
    await store.dispatch(tasksService.endpoints.takeTask.initiate({ projectId: "p1", taskId: "n" }));
    expect(cached(store)?.me.takenOpenCount).toBe(1);
  });

  it("clears the 'New' badge at once when the owner opens the task", async () => {
    const { store, writes } = await storeWithBoard(() => jsonResponse(200, boardTask("n")));
    const seen = store.dispatch(tasksService.endpoints.markTaskSeen.initiate({ projectId: "p1", taskId: "n" }));
    expect(cached(store)?.tasks.find((task) => task.id === "n")?.newForOwner).toBe(false);
    await seen;
    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/n/seen");
  });
});

describe("my card order", () => {
  it("saves one column's order optimistically", async () => {
    const { store, writes } = await storeWithBoard(() =>
      jsonResponse(200, { projectId: "p1", cardOrder: { doing: ["c", "a"], todo: ["n", "t1"] } })
    );
    const save = store.dispatch(
      columnsService.endpoints.setCardOrder.initiate({ projectId: "p1", columnId: "todo", taskIds: ["n", "t1"] })
    );
    expect(cached(store)?.me.cardOrder).toEqual({ doing: ["c", "a"], todo: ["n", "t1"] });
    await save;
    expect(await writes()[0].json()).toEqual({ columnId: "todo", taskIds: ["n", "t1"] });
  });

  it("Reset to team order clears both my column and card orders", async () => {
    const { store } = await storeWithBoard(() => jsonResponse(200, { projectId: "p1", columnOrder: null }));
    await store.dispatch(columnsService.endpoints.resetColumnOrder.initiate("p1"));
    expect(cached(store)?.me).toMatchObject({ columnOrder: null, cardOrder: null });
  });
});

describe("notes and roles", () => {
  it("adds and deletes notes on the right paths", async () => {
    const { store, writes } = await storeWithBoard(() => jsonResponse(200, { id: "n1" }));
    await store.dispatch(notesService.endpoints.addNote.initiate({ taskId: "t1", body: "Tried Safari" }));
    await store.dispatch(notesService.endpoints.deleteNote.initiate({ taskId: "t1", noteId: "n1" }));

    expect(new URL(writes()[0].url).pathname).toBe("/api/tasks/t1/notes");
    expect(await writes()[0].json()).toEqual({ body: "Tried Safari" });
    expect([writes()[1].method, new URL(writes()[1].url).pathname]).toEqual(["DELETE", "/api/notes/n1"]);
  });

  it("promotes, and saves one switch at a time", async () => {
    const { store, writes } = await storeWithBoard(() =>
      jsonResponse(200, { projectId: "p1", userId: "sam", role: "MANAGER", permissions: null })
    );
    await store.dispatch(
      membersService.endpoints.setMemberRole.initiate({ projectId: "p1", userId: "sam", role: "MANAGER" })
    );
    await store.dispatch(
      membersService.endpoints.setManagerPermissions.initiate({ projectId: "p1", userId: "sam", deleteAnyTask: true })
    );

    expect([writes()[0].method, new URL(writes()[0].url).pathname]).toEqual(["PATCH", "/api/projects/p1/members/sam"]);
    expect(await writes()[0].json()).toEqual({ role: "MANAGER" });
    expect(new URL(writes()[1].url).pathname).toBe("/api/projects/p1/members/sam/permissions");
    expect(await writes()[1].json()).toEqual({ deleteAnyTask: true });
  });
});
