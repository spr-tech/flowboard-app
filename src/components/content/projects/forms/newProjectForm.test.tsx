import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { NewProjectForm } from "./newProjectForm";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

describe("NewProjectForm", () => {
  it("keeps Create disabled until the name has text, and previews it", async () => {
    renderWithStore(<NewProjectForm onCreated={vi.fn()} onCancel={vi.fn()} />);
    const create = screen.getByRole("button", { name: "Create project" });
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Project name"), "   ");
    expect(create).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Project name"), "Launch");
    expect(create).toBeEnabled();
    expect(screen.getByText("Launch")).toBeInTheDocument();
  });

  it("posts the name and chosen colour, then hands back the new project", async () => {
    const created = { id: "p1", name: "Launch", colour: "teal" };
    const fetchMock = mockFetch(() => jsonResponse(201, created));
    const onCreated = vi.fn();
    renderWithStore(<NewProjectForm onCreated={onCreated} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Project name"), "  Launch ");
    await userEvent.click(screen.getByRole("radio", { name: "Teal" }));
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    await vi.waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    const request = fetchMock.mock.calls[0][0] as Request;
    expect(request.method).toBe("POST");
    expect(await request.json()).toEqual({ name: "Launch", colour: "teal" });
  });

  it("shows a server field error on the field", async () => {
    mockFetch(() =>
      jsonResponse(400, {
        error: { code: "VALIDATION_FAILED", message: "Check the form", fields: { name: "That name is taken" } },
      })
    );
    renderWithStore(<NewProjectForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("Project name"), "Launch");
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByText("That name is taken")).toBeInTheDocument();
  });

  it("starts on Vermilion and offers all 8 colours", () => {
    renderWithStore(<NewProjectForm onCreated={vi.fn()} onCancel={vi.fn()} />);

    expect(screen.getAllByRole("radio")).toHaveLength(8);
    expect(screen.getByRole("radio", { name: "Vermilion" })).toBeChecked();
  });
});
