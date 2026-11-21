import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import type { MyMembership, ProjectSummary } from "@/models/responses/projectResponses";
import { makeStore } from "@/stores/store";
import { myMembership, projectSummary } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { projectsService } from "./projectsService";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const { listProjects, pinProject, unpinProject, createProject } = projectsService.endpoints;
const today = "2026-11-21";
const NOW = new Date("2026-11-21T15:00:00Z");

const member = myMembership;
const project = (id: string, me?: Partial<MyMembership>): ProjectSummary => projectSummary(id, { me });

/** A response we can hold back, to look at the cache while the request is in flight. */
function deferred() {
  let resolve: (response: Response) => void = () => {};
  const promise = new Promise<Response>((r) => (resolve = r));
  return { promise, resolve };
}

type Store = ReturnType<typeof makeStore>;
const cachedList = (store: Store) => listProjects.select({ today })(store.getState()).data;
const pinnedAt = (store: Store, id: string) => cachedList(store)?.find((p) => p.id === id)?.me.pinnedAt;

describe("projectsService", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    vi.mocked(toast).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lists my projects with the browser's today in the query", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, [project("a")]));
    const store = makeStore();

    await store.dispatch(listProjects.initiate({ today }));

    const request = fetchMock.mock.calls[0][0] as Request;
    expect(new URL(request.url).pathname).toBe("/api/projects");
    expect(new URL(request.url).searchParams.get("today")).toBe(today);
  });

  it("creates a project and refetches the list", async () => {
    const calls: string[] = [];
    mockFetch((request) => {
      calls.push(`${request.method} ${new URL(request.url).pathname}`);
      return request.method === "POST" ? jsonResponse(201, { id: "new" }) : jsonResponse(200, []);
    });
    const store = makeStore();
    const list = store.dispatch(listProjects.initiate({ today }));
    await list;

    await store.dispatch(createProject.initiate({ name: "New", colour: "teal" }));
    await vi.waitFor(() => expect(calls).toEqual(["GET /api/projects", "POST /api/projects", "GET /api/projects"]));
    list.unsubscribe();
  });

  describe("pin and unpin (optimistic)", () => {
    async function storeWithList(projects: ProjectSummary[], pinResponse: Promise<Response>) {
      mockFetch((request) => (request.method === "GET" ? jsonResponse(200, projects) : pinResponse));
      const store = makeStore();
      await store.dispatch(listProjects.initiate({ today }));
      return store;
    }

    it("pins in the cache before the server answers, then keeps the server's time", async () => {
      const response = deferred();
      const store = await storeWithList([project("a"), project("b")], response.promise);

      const pin = store.dispatch(pinProject.initiate("a"));

      expect(pinnedAt(store, "a")).toBe(NOW.toISOString());
      expect(pinnedAt(store, "b")).toBeNull();

      const serverTime = "2026-11-21T15:00:01.000Z";
      response.resolve(jsonResponse(200, { projectId: "a", ...member({ pinnedAt: serverTime }) }));
      await pin;

      expect(pinnedAt(store, "a")).toBe(serverTime);
      expect(toast).not.toHaveBeenCalled();
    });

    it("sends POST to pin and DELETE to unpin", async () => {
      const fetchMock = mockFetch(() => jsonResponse(200, { projectId: "a", ...member() }));
      const store = makeStore();

      await store.dispatch(pinProject.initiate("a"));
      await store.dispatch(unpinProject.initiate("a"));

      const requests = fetchMock.mock.calls.map(([request]) => request as Request);
      expect(requests.map((r) => `${r.method} ${new URL(r.url).pathname}`)).toEqual([
        "POST /api/projects/a/pin",
        "DELETE /api/projects/a/pin",
      ]);
    });

    it("undoes the pin and shows the error toast when the request fails", async () => {
      const response = deferred();
      const store = await storeWithList([project("a")], response.promise);

      const pin = store.dispatch(pinProject.initiate("a"));
      expect(pinnedAt(store, "a")).toBe(NOW.toISOString());

      response.resolve(jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } }));
      await pin;

      expect(pinnedAt(store, "a")).toBeNull();
      expect(toast).toHaveBeenCalledWith({ type: "error", message: "Something went wrong.", id: "error:INTERNAL" });
    });

    it("unpins straight away and puts the pin back if the request fails", async () => {
      const pinned = "2026-11-10T08:00:00.000Z";
      const response = deferred();
      const store = await storeWithList([project("a", { pinnedAt: pinned })], response.promise);

      const unpin = store.dispatch(unpinProject.initiate("a"));
      expect(pinnedAt(store, "a")).toBeNull();

      response.resolve(jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } }));
      await unpin;

      expect(pinnedAt(store, "a")).toBe(pinned);
    });

    it("keeps the first pin's time when an already-pinned project is pinned again", async () => {
      const pinned = "2026-11-10T08:00:00.000Z";
      const response = deferred();
      const store = await storeWithList([project("a", { pinnedAt: pinned })], response.promise);

      const pin = store.dispatch(pinProject.initiate("a"));

      expect(pinnedAt(store, "a")).toBe(pinned);
      response.resolve(jsonResponse(200, { projectId: "a", ...member({ pinnedAt: pinned }) }));
      await pin;
    });
  });
});
