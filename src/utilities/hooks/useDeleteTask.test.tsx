import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { dismissToast, toast, type ToastOptions } from "@/components/ui/toast/toast";
import { projectsService } from "@/services/projectsService";
import { makeStore } from "@/stores/store";
import { selectPendingDeleteTaskIds } from "@/stores/uiSlice";
import { boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch } from "@/test/renderWithStore";
import { flushPendingDeletes, useDeleteTask } from "./useDeleteTask";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const board = projectDetail({ tasks: [boardTask("a", { title: "Fix login" })] });

async function setup(deleteAnswer: () => Response = () => jsonResponse(200, { id: "a" })) {
  const fetchMock = mockFetch((request) => (request.method === "DELETE" ? deleteAnswer() : jsonResponse(200, board)));
  const store = makeStore();
  await store.dispatch(projectsService.endpoints.getProject.initiate("p1"));
  const wrapper = ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider>;
  const { result } = renderHook(() => useDeleteTask("p1"), { wrapper });
  act(() => result.current({ id: "a", title: "Fix login" }));
  const options = vi.mocked(toast).mock.calls.at(-1)?.[0] as ToastOptions;
  const deletes = () => fetchMock.mock.calls.filter(([r]) => (r as Request).method === "DELETE").length;
  const pendingIds = () => selectPendingDeleteTaskIds(store.getState());
  const cached = () =>
    projectsService.endpoints.getProject
      .select("p1")(store.getState())
      .data?.tasks.map((t) => t.id);
  return { store, options, deletes, pendingIds, cached, fetchMock };
}

describe("useDeleteTask", () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
    vi.mocked(dismissToast).mockClear();
  });

  it("hides the task at once and offers Undo for 5 seconds, without sending anything yet", async () => {
    const { options, deletes, pendingIds } = await setup();

    expect(pendingIds()).toEqual(["a"]);
    expect(options).toMatchObject({ message: "Task deleted", duration: 5000, action: { label: "Undo" } });
    expect(deletes()).toBe(0);
  });

  it("Undo brings the task back and never sends the delete", async () => {
    const { options, deletes, pendingIds } = await setup();

    act(() => options.action?.onClick());
    act(() => options.onClose?.()); // a stray close afterwards changes nothing

    expect(pendingIds()).toEqual([]);
    expect(deletes()).toBe(0);
  });

  it("sends the delete when the toast closes, then removes the task and clears the pending id", async () => {
    const { options, deletes, pendingIds, cached } = await setup();

    await act(async () => options.onClose?.());

    await vi.waitFor(() => expect(pendingIds()).toEqual([]));
    expect(deletes()).toBe(1);
    expect(cached()).toEqual([]);
  });

  it("brings the task back when the delete fails (the base query shows the error)", async () => {
    const { options, pendingIds, cached } = await setup(() =>
      jsonResponse(500, { error: { code: "INTERNAL", message: "Something went wrong." } })
    );

    await act(async () => options.onClose?.());

    await vi.waitFor(() => expect(pendingIds()).toEqual([]));
    expect(cached()).toEqual(["a"]);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "Something went wrong." }));
  });

  it("flushing (leaving the board) sends the delete once and closes the toast", async () => {
    const { options, deletes } = await setup();

    await act(async () => flushPendingDeletes());
    await act(async () => options.onClose?.()); // the toast closing afterwards doesn't send it again

    await vi.waitFor(() => expect(deletes()).toBe(1));
    expect(dismissToast).toHaveBeenCalledWith("delete-task:a");
  });

  it("sends waiting deletes with keepalive when the page goes away", async () => {
    const { fetchMock } = await setup();

    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    const sent = fetchMock.mock.calls.find(
      ([input, init]) => String(input).endsWith("/api/tasks/a") && init?.keepalive
    );
    expect(sent?.[1]).toMatchObject({ method: "DELETE", keepalive: true });
  });
});
