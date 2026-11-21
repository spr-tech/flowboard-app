import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { myMembership } from "@/test/projectFixtures";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import ProjectBoardContent from "./projectBoardContent";

vi.mock("@/components/ui/toast/toast", () => ({ toast: vi.fn() }));

describe("ProjectBoardContent", () => {
  it("loads the project (which records the visit) and links to its settings", async () => {
    const fetchMock = mockFetch(() =>
      jsonResponse(200, {
        id: "p1",
        name: "Website relaunch",
        colour: "teal",
        createdAt: "2026-11-01T10:00:00.000Z",
        updatedAt: "2026-11-20T10:00:00.000Z",
        taskCount: 1,
        columns: [
          { id: "c1", name: "To do", position: 1000, isDone: false, taskCount: 1 },
          { id: "c2", name: "Done", position: 2000, isDone: true, taskCount: 0 },
        ],
        me: myMembership(),
      })
    );
    renderWithStore(<ProjectBoardContent projectId="p1" />);

    expect(await screen.findByRole("heading", { name: "Website relaunch" })).toBeInTheDocument();
    expect(screen.getByText("1 task · To do, Done")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/projects/p1/settings");
    expect(new URL((fetchMock.mock.calls[0][0] as Request).url).pathname).toBe("/api/projects/p1");
  });
});
