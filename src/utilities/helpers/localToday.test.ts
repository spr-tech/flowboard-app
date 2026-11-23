import { afterEach, describe, expect, it, vi } from "vitest";

import { localToday } from "./localToday";

// Tests run in America/New_York (vitest.config.mts), five hours behind UTC in November.
describe("localToday", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the local date late in the evening, when UTC is already on the next day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-22T04:00:00Z")); // 11 pm on 21 November in New York

    expect(localToday()).toBe("2026-11-21");
  });

  it("pads single-digit months and days", () => {
    expect(localToday(new Date(2026, 0, 5, 9, 30))).toBe("2026-01-05");
  });
});
