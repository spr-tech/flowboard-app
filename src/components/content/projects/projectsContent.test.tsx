import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { projectSummary } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import ProjectsContent from "./projectsContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

const projects = [
  projectSummary("fresh", { name: "Fresh", updatedAt: "2026-11-21T10:00:00.000Z" }),
  projectSummary("pin-2", { name: "Second pin", me: { pinnedAt: "2026-11-15T10:00:00.000Z" } }),
  projectSummary("shared", { name: "Shared", me: { role: "MEMBER" }, updatedAt: "2026-11-21T11:00:00.000Z" }),
  projectSummary("pin-1", { name: "First pin", me: { pinnedAt: "2026-11-10T10:00:00.000Z" } }),
];

const cardNames = () => screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);

describe("ProjectsContent", () => {
  it("while loading: the title, tabs and New project show at once; six card skeletons follow after 200ms", async () => {
    let answer: (response: Response) => void = () => {};
    mockFetch(() => new Promise<Response>((resolve) => (answer = resolve)));
    renderWithStore(<ProjectsContent filter="all" />);

    expect(screen.getByRole("heading", { name: "Projects", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New project" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Filter projects" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Loading your projects");
    expect(screen.getByRole("status").closest("[aria-busy='true']")).not.toBeNull();
    // No shapes yet: a fast load never flashes a skeleton.
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);

    // The count line, then per card: tile, badge, name, updated, two progress labels, bar, 3 avatars.
    await waitFor(() => expect(document.querySelectorAll(".skeleton")).toHaveLength(1 + 6 * 10));
    expect(document.querySelectorAll(".skeleton[aria-hidden='true']")).toHaveLength(61);

    answer(jsonResponse(200, projects));
    await screen.findByText("First pin");
    expect(document.querySelectorAll(".skeleton")).toHaveLength(0);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(document.querySelector("[aria-busy]")).toBeNull();
  });

  it("lists pinned projects first in pin order, then the rest newest-updated first", async () => {
    mockFetch(() => jsonResponse(200, projects));
    renderWithStore(<ProjectsContent filter="all" />);

    await screen.findByText("First pin");
    expect(cardNames()).toEqual(["First pin", "Second pin", "Shared", "Fresh"]);
    expect(screen.getByText("4 projects · 3 you own")).toBeInTheDocument();
    expect(screen.getByText("Pinned projects come first. Your first 3 pins show in the sidebar.")).toBeInTheDocument();
  });

  it("applies the filter tab, and marks the active tab", async () => {
    mockFetch(() => jsonResponse(200, projects));
    renderWithStore(<ProjectsContent filter="shared" />);

    await screen.findByText("Shared");
    expect(cardNames()).toEqual(["Shared"]);
    const tabs = screen.getByRole("navigation", { name: "Filter projects" });
    expect(within(tabs).getByRole("link", { name: "Shared with me" })).toHaveAttribute("aria-current", "page");
  });

  it("puts the pin toggle next to the card link, not inside it", async () => {
    mockFetch(() => jsonResponse(200, [projectSummary("a", { name: "Alpha" })]));
    renderWithStore(<ProjectsContent filter="all" />);

    const toggle = await screen.findByRole("button", { name: "Pin Alpha" });
    expect(toggle.closest("a")).toBeNull();
  });

  it("shows the description under the name, clamped to 2 lines, and nothing extra when it's empty", async () => {
    mockFetch(() =>
      jsonResponse(200, [
        projectSummary("a", { name: "Alpha", description: "A long description of the launch work" }),
        projectSummary("b", { name: "Beta", description: null }),
      ])
    );
    renderWithStore(<ProjectsContent filter="all" />);

    const description = await screen.findByText("A long description of the launch work");
    expect(description).toHaveClass("line-clamp-2");
    const beta = screen.getByRole("heading", { name: "Beta" }).parentElement;
    expect(beta?.querySelectorAll(".line-clamp-2")).toHaveLength(0);
  });

  it("offers to create the first project when there are none", async () => {
    mockFetch(() => jsonResponse(200, []));
    renderWithStore(<ProjectsContent filter="all" />);

    expect(await screen.findByRole("heading", { name: "Create your first project" })).toBeInTheDocument();
  });
});
