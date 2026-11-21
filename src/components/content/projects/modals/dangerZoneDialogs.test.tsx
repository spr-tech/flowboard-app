import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { projectDangerDialogOpened, selectProjectDangerDialog } from "@/stores/uiSlice";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { DeleteProjectDialog } from "./deleteProjectDialog";
import { LeaveProjectDialog } from "./leaveProjectDialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const project = { id: "p1", name: "Website relaunch", taskCount: 12 };

describe("DeleteProjectDialog", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(toast).mockClear();
  });

  function open() {
    const result = renderWithStore(<DeleteProjectDialog project={project} />);
    result.store.dispatch(projectDangerDialogOpened("delete"));
    return result;
  }

  it("stays locked until the exact project name is typed", async () => {
    open();
    const remove = await screen.findByRole("button", { name: "Delete project" });
    expect(screen.getByText(/all 12 tasks/)).toBeInTheDocument();
    expect(remove).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Type “Website relaunch” to confirm"), "website relaunch");
    expect(remove).toBeDisabled();

    await userEvent.clear(screen.getByLabelText("Type “Website relaunch” to confirm"));
    await userEvent.type(screen.getByLabelText("Type “Website relaunch” to confirm"), "Website relaunch");
    expect(remove).toBeEnabled();
  });

  it("deletes with the typed name, closes, toasts and goes to /projects", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { id: "p1" }));
    const { store } = open();

    await userEvent.type(await screen.findByLabelText("Type “Website relaunch” to confirm"), "Website relaunch");
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/projects"));
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("DELETE");
    expect(await request.json()).toEqual({ name: "Website relaunch" });
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "Website relaunch deleted" });
    expect(selectProjectDangerDialog(store.getState())).toBeNull();
  });

  it("shows the server's NAME_MISMATCH on the field", async () => {
    mockFetch(() =>
      jsonResponse(400, {
        error: {
          code: "NAME_MISMATCH",
          message: "The name doesn't match.",
          fields: { name: "Type the project name exactly as it's shown" },
        },
      })
    );
    open();

    await userEvent.type(await screen.findByLabelText("Type “Website relaunch” to confirm"), "Website relaunch");
    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));

    expect(await screen.findByText("Type the project name exactly as it's shown")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});

describe("LeaveProjectDialog", () => {
  beforeEach(() => {
    push.mockClear();
    vi.mocked(toast).mockClear();
  });

  it("says how many of my tasks become unassigned, then leaves and goes to /projects", async () => {
    const fetchMock = mockFetch((request) => {
      const path = new URL(request.url).pathname;
      if (path === "/api/me") {
        return jsonResponse(200, { id: "sam", name: "Sam", email: "sam@example.com", image: null, hasPassword: true });
      }
      if (path === "/api/projects/p1/members") {
        return jsonResponse(200, [
          { id: "demo", name: "Demo", email: "demo@example.com", image: null, role: "OWNER", taskCount: 4 },
          { id: "sam", name: "Sam", email: "sam@example.com", image: null, role: "MEMBER", taskCount: 1 },
        ]);
      }
      return jsonResponse(200, { projectId: "p1", unassignedTaskCount: 1 });
    });
    const { store } = renderWithStore(<LeaveProjectDialog project={project} />);
    store.dispatch(projectDangerDialogOpened("leave"));

    expect(await screen.findByText(/Your 1 task here becomes unassigned\./)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Leave project" }));

    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/projects"));
    const leave = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "POST");
    expect(new URL(leave?.url ?? "").pathname).toBe("/api/projects/p1/leave");
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "You left Website relaunch" });
  });
});
