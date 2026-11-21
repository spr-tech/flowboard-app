import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { boardMembership, projectDetail } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import ProjectSettingsContent from "./projectSettingsContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const detail = (role: "OWNER" | "MEMBER"): ProjectDetail =>
  projectDetail({ colour: "blue", taskCount: 3, me: boardMembership({ role }) });

describe("ProjectSettingsContent", () => {
  it("gives the owner editable General settings and Delete in the Danger zone", async () => {
    mockFetch(() => jsonResponse(200, detail("OWNER")));
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    expect(await screen.findByText("Website relaunch · you're the owner")).toBeInTheDocument();
    expect(screen.getByLabelText("Project name")).toBeEnabled();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete project" }));
    expect(await screen.findByRole("dialog", { name: "Delete this project?" })).toBeInTheDocument();
  });

  it("shows a member read-only settings, the owner-only note, and Leave instead of Delete", async () => {
    mockFetch(() => jsonResponse(200, detail("MEMBER")));
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    expect(await screen.findByText("Website relaunch · you're a member")).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Only the owner can change the name");
    expect(screen.getByLabelText("Project name")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Leave project" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete project" })).not.toBeInTheDocument();
  });

  it("says the project wasn't found on a 404", async () => {
    mockFetch(() =>
      jsonResponse(404, { error: { code: "PROJECT_NOT_FOUND", message: "We couldn't find that project." } })
    );
    renderWithStore(<ProjectSettingsContent projectId="nope" />);

    expect(await screen.findByRole("heading", { name: "We couldn't find that project" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to your projects" })).toHaveAttribute("href", "/projects");
  });
});
