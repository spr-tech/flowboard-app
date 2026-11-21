import { describe, expect, it } from "vitest";

import { formatDueDay, formatRelativeTime } from "./dateLabels";

describe("formatRelativeTime", () => {
  const now = new Date("2026-11-21T15:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it.each([
    [10_000, "just now"],
    [-5_000, "just now"],
    [60_000, "1 minute ago"],
    [12 * 60_000, "12 minutes ago"],
    [60 * 60_000, "1 hour ago"],
    [3 * 60 * 60_000 + 59 * 60_000, "3 hours ago"],
    [24 * 60 * 60_000, "1 day ago"],
    [2 * 24 * 60 * 60_000, "2 days ago"],
  ])("%i ms ago reads %s", (ms, label) => {
    expect(formatRelativeTime(ago(ms), now)).toBe(label);
  });

  it("shows the date after 4 weeks, with the year only when it differs", () => {
    expect(formatRelativeTime("2026-09-03T15:00:00Z", now)).toBe("on 3 Sept");
    expect(formatRelativeTime("2025-09-03T15:00:00Z", now)).toBe("on 3 Sept 2025");
  });
});

describe("formatDueDay", () => {
  // 21 November 2026 is a Saturday.
  const today = "2026-11-21";

  it.each([
    ["2026-11-21", "today"],
    ["2026-11-22", "tomorrow"],
    ["2026-11-24", "Tue"],
    ["2026-11-27", "Fri"],
    ["2026-11-28", "28 Nov"],
    ["2027-01-03", "3 Jan 2027"],
  ])("%s reads %s", (due, label) => {
    expect(formatDueDay(due, today)).toBe(label);
  });

  it("works across a daylight-saving change", () => {
    // New York leaves daylight saving on 1 November 2026; calendar days still count as whole days.
    expect(formatDueDay("2026-11-02", "2026-10-31")).toBe("Mon");
  });
});
