// @vitest-environment node
import { describe, expect, it } from "vitest";

import { addDays, completedSince, dayRange, daysBetween, dueGroup, localDay } from "./dashboardDates";

describe("dueGroup (against the browser's today)", () => {
  const today = "2026-11-23";

  it("puts days before today in Overdue, today in Today, the next 6 days in This week, then Later", () => {
    expect(dueGroup("2026-11-22", today)).toBe("overdue");
    expect(dueGroup("2025-12-31", today)).toBe("overdue");
    expect(dueGroup("2026-11-23", today)).toBe("today");
    expect(dueGroup("2026-11-24", today)).toBe("week");
    expect(dueGroup("2026-11-29", today)).toBe("week");
    expect(dueGroup("2026-11-30", today)).toBe("later");
    expect(dueGroup(null, today)).toBe("none");
  });

  it("follows the browser's day, not the server's: late on the 23rd in Lagos is still the 23rd", () => {
    // The server's UTC clock may already say the 24th; what counts is the `today` sent.
    expect(dueGroup("2026-11-23", "2026-11-23")).toBe("today");
    expect(dueGroup("2026-11-23", "2026-11-24")).toBe("overdue");
  });

  it("crosses month and year ends", () => {
    expect(dueGroup("2027-01-02", "2026-12-30")).toBe("week");
    expect(dueGroup("2026-02-28", "2026-03-01")).toBe("overdue");
  });
});

describe("day arithmetic", () => {
  it("adds, counts and lists days", () => {
    expect(addDays("2026-11-23", 7)).toBe("2026-11-30");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-21", "2026-11-23")).toBe(2);
    expect(dayRange("2026-11-29", 3)).toEqual(["2026-11-29", "2026-11-30", "2026-12-01"]);
  });
});

describe("localDay", () => {
  const moment = new Date("2026-11-23T23:30:00Z");

  it("gives the day a moment falls on in a zone", () => {
    expect(localDay(moment, "UTC")).toBe("2026-11-23");
    expect(localDay(moment, "Africa/Lagos")).toBe("2026-11-24"); // UTC+1
    expect(localDay(moment, "America/New_York")).toBe("2026-11-23"); // UTC−5
    expect(localDay(new Date("2026-11-23T03:00:00Z"), "America/Los_Angeles")).toBe("2026-11-22");
  });
});

describe("completedSince", () => {
  it("reaches a day before the window's first day, so every zone's first day is covered", () => {
    // 7 days ending the 23rd start on the 17th; fetch from the 16th (UTC).
    expect(completedSince("2026-11-23", 7).toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
});
