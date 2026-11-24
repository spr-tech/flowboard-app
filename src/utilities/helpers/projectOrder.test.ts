import { describe, expect, it } from "vitest";

import type { MyMembership } from "@/models/responses/projectResponses";
import {
  countPinned,
  filterProjects,
  mostRecentlyOpened,
  selectSidebarProjects,
  sortForProjectsPage,
  toProjectFilter,
} from "./projectOrder";

type Row = { id: string; updatedAt: string; me: MyMembership };

/** A project row; times are minutes past 09:00 on 20 November 2026, so the order is easy to read. */
function row(
  id: string,
  {
    role = "OWNER",
    pinned,
    opened,
    joined = 0,
    updated = 0,
  }: { role?: MyMembership["role"]; pinned?: number; opened?: number; joined?: number; updated?: number } = {}
): Row {
  const at = (minutes: number) => new Date(Date.UTC(2026, 10, 20, 9, minutes)).toISOString();
  return {
    id,
    updatedAt: at(updated),
    me: {
      role,
      permissions: null,
      pinnedAt: pinned === undefined ? null : at(pinned),
      lastOpenedAt: opened === undefined ? null : at(opened),
      joinedAt: at(joined),
    },
  };
}

const ids = (rows: Row[]) => rows.map((r) => r.id);

describe("mostRecentlyOpened", () => {
  it("is the project I opened last, pinned or not", () => {
    const projects = [row("a", { opened: 10 }), row("b", { pinned: 1, opened: 30 }), row("c", { opened: 20 })];
    expect(mostRecentlyOpened(projects)?.id).toBe("b");
  });

  it("counts a project I've never opened from when I joined", () => {
    expect(mostRecentlyOpened([row("old", { opened: 5 }), row("joined", { joined: 40 })])?.id).toBe("joined");
  });

  it("is null when I have no projects", () => {
    expect(mostRecentlyOpened([])).toBeNull();
  });
});

describe("selectSidebarProjects", () => {
  it("shows only pins when there are 3 or more, oldest pin first", () => {
    const projects = [
      row("a", { pinned: 30 }),
      row("b", { pinned: 10 }),
      row("c", { pinned: 20 }),
      row("d", { pinned: 40 }),
    ];

    expect(ids(selectSidebarProjects(projects))).toEqual(["b", "c", "a"]);
  });

  it("fills the slots after the pins with the most recently opened projects", () => {
    const projects = [
      row("old", { opened: 5 }),
      row("pin", { pinned: 1 }),
      row("new", { opened: 50 }),
      row("mid", { opened: 20 }),
    ];

    expect(ids(selectSidebarProjects(projects))).toEqual(["pin", "new", "mid"]);
  });

  it("uses recents only when nothing is pinned", () => {
    const projects = [
      row("a", { opened: 10 }),
      row("b", { opened: 30 }),
      row("c", { opened: 20 }),
      row("d", { opened: 1 }),
    ];

    expect(ids(selectSidebarProjects(projects))).toEqual(["b", "c", "a"]);
  });

  it("never lists a pinned project again among the recents, even if I opened it last", () => {
    const projects = [row("pin", { pinned: 1, opened: 59 }), row("other", { opened: 10 })];

    expect(ids(selectSidebarProjects(projects))).toEqual(["pin", "other"]);
  });

  it("shows at most 3, and fewer when I have fewer projects", () => {
    const many = Array.from({ length: 6 }, (_, i) => row(`p${i}`, { opened: i }));

    expect(selectSidebarProjects(many)).toHaveLength(3);
    expect(ids(selectSidebarProjects([row("only")]))).toEqual(["only"]);
    expect(selectSidebarProjects([])).toEqual([]);
  });

  it("counts a never-opened project from when I joined", () => {
    const projects = [
      row("opened-early", { opened: 10 }),
      row("joined-late", { joined: 40 }),
      row("opened-late", { opened: 30, joined: 0 }),
      row("joined-early", { joined: 5 }),
    ];

    expect(ids(selectSidebarProjects(projects))).toEqual(["joined-late", "opened-late", "opened-early"]);
  });
});

describe("sortForProjectsPage", () => {
  it("puts pinned projects first in pin order, then the rest newest-updated first", () => {
    const projects = [
      row("stale", { updated: 1 }),
      row("pin-2", { pinned: 20, updated: 0 }),
      row("fresh", { updated: 50 }),
      row("pin-1", { pinned: 10, updated: 0 }),
    ];

    expect(ids(sortForProjectsPage(projects))).toEqual(["pin-1", "pin-2", "fresh", "stale"]);
  });

  it("keeps pins first within a filter tab", () => {
    const projects = [
      row("mine", { updated: 50 }),
      row("shared", { role: "MEMBER", updated: 40 }),
      row("shared-pin", { role: "MEMBER", pinned: 5 }),
      row("mine-pin", { pinned: 1 }),
    ];

    expect(ids(sortForProjectsPage(filterProjects(projects, "shared")))).toEqual(["shared-pin", "shared"]);
    expect(ids(sortForProjectsPage(filterProjects(projects, "owned")))).toEqual(["mine-pin", "mine"]);
    expect(ids(sortForProjectsPage(filterProjects(projects, "all")))).toEqual([
      "mine-pin",
      "shared-pin",
      "mine",
      "shared",
    ]);
  });

  it("doesn't change the list it was given", () => {
    const projects = [row("a", { updated: 1 }), row("b", { updated: 2 })];

    sortForProjectsPage(projects);

    expect(ids(projects)).toEqual(["a", "b"]);
  });
});

describe("toProjectFilter", () => {
  it("accepts the three tabs and treats anything else as all", () => {
    expect(toProjectFilter("owned")).toBe("owned");
    expect(toProjectFilter("shared")).toBe("shared");
    expect(toProjectFilter("mine")).toBe("all");
    expect(toProjectFilter(undefined)).toBe("all");
  });
});

describe("countPinned", () => {
  it("counts my pinned projects", () => {
    expect(countPinned([row("a", { pinned: 1 }), row("b"), row("c", { pinned: 2 })])).toBe(2);
  });
});
