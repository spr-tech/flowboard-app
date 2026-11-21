import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/ui/toast/toast";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { ProjectGeneralForm } from "./projectGeneralForm";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const project = { id: "p1", name: "Website", colour: "vermilion" as const };

describe("ProjectGeneralForm", () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
  });

  it("enables Save only when something changed, and Cancel puts the saved values back", async () => {
    renderWithStore(<ProjectGeneralForm project={project} canEdit />);
    const save = screen.getByRole("button", { name: "Save changes" });
    const name = screen.getByLabelText("Project name");
    expect(save).toBeDisabled();

    await userEvent.type(name, " ");
    expect(save).toBeDisabled(); // a trailing space isn't a change

    await userEvent.type(name, "2");
    expect(save).toBeEnabled();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(name).toHaveValue("Website");
    expect(save).toBeDisabled();
  });

  it("sends only what changed and says Project updated", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, { ...project, colour: "teal", columns: [] }));
    renderWithStore(<ProjectGeneralForm project={project} canEdit />);

    await userEvent.click(screen.getByRole("radio", { name: "Teal" }));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith({ type: "success", message: "Project updated" }));
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("PATCH");
    expect(new URL(request.url).pathname).toBe("/api/projects/p1");
    expect(await request.json()).toEqual({ colour: "teal" });
  });

  it("shows members the values, disabled, with no buttons", () => {
    renderWithStore(<ProjectGeneralForm project={project} canEdit={false} />);

    expect(screen.getByLabelText("Project name")).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Teal" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
  });
});
