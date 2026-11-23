import { describe, expect, it } from "vitest";

import { groupsForFilter, toDashboardFilter } from "./dashboardFilter";

describe("dashboard filter", () => {
  it("reads ?filter= and ignores anything else", () => {
    expect(toDashboardFilter("overdue")).toBe("overdue");
    expect(toDashboardFilter("week")).toBe("week");
    expect(toDashboardFilter("done")).toBe("done");
    expect(toDashboardFilter("everything")).toBe("all");
    expect(toDashboardFilter(undefined)).toBe("all");
  });

  it("maps each card to the groups it shows", () => {
    expect(groupsForFilter("overdue")).toEqual(["overdue"]);
    expect(groupsForFilter("week")).toEqual(["today", "week"]);
    expect(groupsForFilter("all")).toEqual(["overdue", "today", "week", "later", "none"]);
  });
});
