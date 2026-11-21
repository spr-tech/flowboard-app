import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { dialogOpened, selectOpenDialog } from "@/stores/uiSlice";
import { boardTask, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { DeleteColumnDialog } from "./deleteColumnDialog";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn(), dismissToast: vi.fn() }));

const project = projectDetail({
  tasks: [boardTask("a", { columnId: "doing" }), boardTask("b", { columnId: "doing", position: 2000 })],
});

function open(columnId: string, allowDeletingTasks = true) {
  const fetchMock = mockFetch(() => jsonResponse(200, { id: columnId }));
  const result = renderWithStore(<DeleteColumnDialog project={project} allowDeletingTasks={allowDeletingTasks} />);
  act(() => {
    result.store.dispatch(dialogOpened({ kind: "deleteColumn", columnId }));
  });
  const sentBody = async () => {
    const request = fetchMock.mock.calls.map(([r]) => r as Request).find((r) => r.method === "DELETE");
    return request?.json();
  };
  return { ...result, sentBody };
}

describe("DeleteColumnDialog", () => {
  beforeEach(() => vi.mocked(toast).mockClear());

  it("an empty column gets a simple confirm", async () => {
    const { store } = open("todo");

    expect(screen.getByRole("dialog", { name: "Delete “To do”?" })).toBeInTheDocument();
    expect(screen.getByText("This column is empty, so nothing else is affected.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete column" }));

    await vi.waitFor(() => expect(selectOpenDialog(store.getState())).toBeNull());
    expect(toast).toHaveBeenCalledWith({ type: "success", message: "To do deleted" });
  });

  it("with tasks, moving them is the default, to the first other column unless another is picked", async () => {
    const { sentBody } = open("doing");

    expect(screen.getByText("This column has 2 tasks.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Move them, then delete the column/ })).toBeChecked();
    await userEvent.selectOptions(screen.getByRole("combobox", { name: "Move 2 tasks to" }), "done");
    await userEvent.click(screen.getByRole("button", { name: "Move tasks and delete" }));

    await vi.waitFor(async () => expect(await sentBody()).toEqual({ moveTasksTo: "done" }));
  });

  it("deleting the tasks too is locked until the exact column name is typed", async () => {
    const { sentBody } = open("doing");

    await userEvent.click(screen.getByRole("radio", { name: /Delete the column and its 2 tasks/ }));
    const confirm = screen.getByRole("button", { name: "Delete column and 2 tasks" });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByRole("textbox"), "in progress");
    expect(confirm).toBeDisabled();
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "In progress");
    expect(confirm).toBeEnabled();

    await userEvent.click(confirm);
    await vi.waitFor(async () => expect(await sentBody()).toEqual({ confirmName: "In progress" }));
  });

  it("project settings only offers moving the tasks", () => {
    open("doing", false);

    expect(screen.queryByRole("radio", { name: /Delete the column and its/ })).not.toBeInTheDocument();
    expect(screen.getByText("To delete the tasks too, use the column's menu on the board.")).toBeInTheDocument();
  });
});
