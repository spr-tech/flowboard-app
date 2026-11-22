import { describe, expect, it } from "vitest";

import { dashboardQuerySchema, myTasksQuerySchema } from "./dashboardValidation";

describe("dashboardQuerySchema", () => {
  it("takes a real day and a real time zone", () => {
    expect(dashboardQuerySchema.parse({ today: "2026-11-23", tz: "Africa/Lagos" })).toEqual({
      today: "2026-11-23",
      tz: "Africa/Lagos",
    });
  });

  it("refuses days that don't exist and zones that don't exist", () => {
    expect(dashboardQuerySchema.safeParse({ today: "2026-02-30", tz: "UTC" }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ today: "2026-11-23", tz: "Mars/Olympus" }).success).toBe(false);
    expect(dashboardQuerySchema.safeParse({ today: "2026-11-23" }).success).toBe(false);
  });

  it("my tasks only groups by due date", () => {
    expect(myTasksQuerySchema.safeParse({ today: "2026-11-23", tz: "UTC", group: "due" }).success).toBe(true);
    expect(myTasksQuerySchema.safeParse({ today: "2026-11-23", tz: "UTC", group: "project" }).success).toBe(false);
  });
});
