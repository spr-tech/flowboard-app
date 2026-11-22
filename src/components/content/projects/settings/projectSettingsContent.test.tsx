import { screen, waitFor } from "@testing-library/react";
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
  it("while loading: the fixed headings show at once; the project's parts are skeletons after 200ms", async () => {
    // The project answers only when the test says so; /api/me answers at once.
    let answer: (response: Response) => void = () => {};
    mockFetch((request) =>
      request.url.endsWith("/api/projects/p1")
        ? new Promise<Response>((resolve) => (answer = resolve))
        : jsonResponse(200, { id: "demo", name: "Alex Morgan", email: "demo@example.com", image: null })
    );
    renderWithStore(<ProjectSettingsContent projectId="p1" />);

    expect(screen.getByRole("heading", { name: "Project settings", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Columns" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Danger zone" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to board" })).toHaveAttribute("href", "/projects/p1");
    expect(screen.getByRole("status")).toHaveTextContent("Loading project settings");
    expect(screen.getByRole("status").closest("[aria-busy='true']")).not.toBeNull();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);

    await waitFor(() => expect(document.querySelectorAll(".skeleton").length).toBeGreaterThan(20));
    expect(document.querySelectorAll(".skeleton:not([aria-hidden='true'])")).toHaveLength(0);

    answer(jsonResponse(200, detail("OWNER")));
    expect(await screen.findByText("Website relaunch · you're the owner")).toBeInTheDocument();
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

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
