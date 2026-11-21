import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { projectSummary } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { SidebarProjects } from "./sidebarProjects";

describe("SidebarProjects", () => {
  it("lists pins first with a Pinned marker, then recently opened projects, at most 3", async () => {
    mockFetch(() =>
      jsonResponse(200, [
        projectSummary("a", { name: "Opened long ago", me: { lastOpenedAt: "2026-11-02T10:00:00.000Z" } }),
        projectSummary("b", { name: "Pinned one", me: { pinnedAt: "2026-11-05T10:00:00.000Z" } }),
        projectSummary("c", { name: "Opened today", me: { lastOpenedAt: "2026-11-21T09:00:00.000Z" } }),
        projectSummary("d", { name: "Opened yesterday", me: { lastOpenedAt: "2026-11-20T09:00:00.000Z" } }),
      ])
    );
    renderWithStore(<SidebarProjects />);

    const list = await screen.findByRole("list");
    const links = within(list).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Pinned one", "Opened today", "Opened yesterday"]);
    expect(links[0]).toHaveAttribute("href", "/projects/b");
    expect(within(links[0]).getByRole("img", { name: "Pinned" })).toBeInTheDocument();
    expect(within(links[1]).queryByRole("img", { name: "Pinned" })).not.toBeInTheDocument();
  });

  it("shows nothing when I have no projects", async () => {
    const fetchMock = mockFetch(() => jsonResponse(200, []));
    const { container } = renderWithStore(<SidebarProjects />);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing while loading", () => {
    mockFetch(() => new Promise<Response>(() => undefined)); // never answers
    const { container } = renderWithStore(<SidebarProjects />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Your projects")).not.toBeInTheDocument();
  });
});
