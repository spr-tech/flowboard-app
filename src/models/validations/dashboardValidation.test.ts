import { describe, expect, it } from "vitest";

import { activityPageQuerySchema, dashboardQuerySchema, myTasksQuerySchema } from "./dashboardValidation";

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

describe("activityPageQuerySchema", () => {
  it("defaults to 5 rows from the newest", () => {
    expect(activityPageQuerySchema.parse({})).toEqual({ limit: 5 });
  });

  it("reads limit from the query string and a cursor as its time and id", () => {
    expect(activityPageQuerySchema.parse({ limit: "10", cursor: "2026-11-23T10:00:00.000Z_cmw1" })).toEqual({
      limit: 10,
      cursor: { createdAt: new Date("2026-11-23T10:00:00.000Z"), id: "cmw1" },
    });
  });

  it("refuses limits out of range and cursors it didn't write", () => {
    for (const limit of ["0", "51", "2.5", "five"]) {
      expect(activityPageQuerySchema.safeParse({ limit }).success).toBe(false);
    }
    for (const cursor of [
      "",
      "cmw1",
      "2026-11-23_cmw1",
      "2026-13-45T10:00:00.000Z_cmw1",
      "2026-11-23T10:00:00.000Z_a b",
    ]) {
      expect(activityPageQuerySchema.safeParse({ cursor }).success).toBe(false);
    }
  });
});
