import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ActivityItem, ActivityPage } from "@/models/responses/dashboardResponses";
import { jsonResponse, mockFetch, renderWithStore } from "@/test/renderWithStore";
import { TeamActivity } from "./projectsAndActivity";

/** Event n: "Ada created Task n", n minutes ago (higher n = older). */
const event = (n: number): ActivityItem => ({
  id: `a${n}`,
  action: "task.created",
  meta: { title: `Task ${n}` },
  createdAt: new Date(Date.now() - n * 60_000).toISOString(),
  actor: { id: "ada", name: "Ada", image: null },
  project: { id: "p1", name: "Website relaunch", colour: "lime" },
  task: { id: `t${n}`, title: `Task ${n}` },
});

/** The server: `feed` newest first, 5 per page, cursors "c<id>" naming the last row of the page before. */
let feed: ActivityItem[] = [];
function page(cursor: string | null): ActivityPage {
  const start = cursor ? feed.findIndex((item) => `c${item.id}` === cursor) + 1 : 0;
  const items = feed.slice(start, start + 5);
  return { items, nextCursor: start + 5 < feed.length ? `c${items.at(-1)?.id}` : null };
}

let fetchMock: ReturnType<typeof mockFetch>;
/** How many times each page was asked for, by cursor ("first" for the newest). */
const requests = () =>
  fetchMock.mock.calls.map(([request]) => new URL((request as Request).url).searchParams.get("cursor") ?? "first");

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  feed = Array.from({ length: 12 }, (_, index) => event(index + 1)); // a1 (newest) … a12
  fetchMock = mockFetch((request) => {
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/dashboard/activity");
    expect(url.searchParams.get("limit")).toBe("5");
    return jsonResponse(200, page(url.searchParams.get("cursor")));
  });
});
afterEach(() => vi.useRealTimers());

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const rows = () =>
  within(screen.getByRole("region", { name: "Team activity" }))
    .getAllByRole("listitem")
    .map((row) => /Task \d+/.exec(row.textContent ?? "")?.[0]);
const button = (name: string) => screen.getByRole("button", { name });

describe("TeamActivity", () => {
  it("shows 5 rows, newest at the top; Newer is disabled on the first page", async () => {
    renderWithStore(<TeamActivity meId={null} />);

    expect(await screen.findByText("Task 1")).toBeInTheDocument();
    expect(rows()).toEqual(["Task 1", "Task 2", "Task 3", "Task 4", "Task 5"]);
    expect(button("Newer")).toBeDisabled();
    expect(button("Older")).toBeEnabled();
  });

  it("Older pages back to the end (Older disabled there), and Newer comes back the same way", async () => {
    renderWithStore(<TeamActivity meId={null} />);
    await screen.findByText("Task 1");

    await user().click(button("Older"));
    expect(await screen.findByText("Task 6")).toBeInTheDocument();
    expect(rows()).toEqual(["Task 6", "Task 7", "Task 8", "Task 9", "Task 10"]);
    expect(button("Newer")).toBeEnabled();

    await user().click(button("Older"));
    expect(await screen.findByText("Task 11")).toBeInTheDocument();
    expect(rows()).toEqual(["Task 11", "Task 12"]);
    expect(button("Older")).toBeDisabled();

    await user().click(button("Newer"));
    expect(await screen.findByText("Task 6")).toBeInTheDocument();
    await user().click(button("Newer"));
    expect(await screen.findByText("Task 1")).toBeInTheDocument();
    expect(button("Newer")).toBeDisabled();
  });

  it("has no page buttons when everything fits on one page", async () => {
    feed = feed.slice(0, 3);
    renderWithStore(<TeamActivity meId={null} />);

    expect(await screen.findByText("Task 3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Older" })).not.toBeInTheDocument();
  });

  it("polling refreshes the first page only; an older page stays put and offers New activity", async () => {
    renderWithStore(<TeamActivity meId={null} />);
    await screen.findByText("Task 1");
    await user().click(button("Older"));
    await screen.findByText("Task 6");
    const olderRequests = requests().filter((cursor) => cursor !== "first").length;

    // Two new events arrive, then the 30-second poll.
    feed = [event(0), { ...event(0), id: "a00", meta: { title: "Task 0" } }, ...feed];
    await act(() => vi.advanceTimersByTimeAsync(31_000));

    expect(requests().filter((cursor) => cursor === "first").length).toBeGreaterThanOrEqual(2);
    expect(requests().filter((cursor) => cursor !== "first")).toHaveLength(olderRequests);
    expect(rows()).toEqual(["Task 6", "Task 7", "Task 8", "Task 9", "Task 10"]);
    const pill = await screen.findByRole("button", { name: "New activity" });

    await user().click(pill);
    expect(rows()[0]).toBe("Task 0");
    expect(button("Newer")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "New activity" })).not.toBeInTheDocument();
  });

  it("on the first page, polling just updates the list (no pill)", async () => {
    renderWithStore(<TeamActivity meId={null} />);
    await screen.findByText("Task 1");

    feed = [event(0), ...feed];
    await act(() => vi.advanceTimersByTimeAsync(31_000));

    expect(await screen.findByText("Task 0")).toBeInTheDocument();
    expect(rows()).toEqual(["Task 0", "Task 1", "Task 2", "Task 3", "Task 4"]);
    expect(screen.queryByRole("button", { name: "New activity" })).not.toBeInTheDocument();
  });
});
