import { describe, expect, it } from "vitest";

import type { ActivityItem } from "@/models/responses/dashboardResponses";
import { activitySentence } from "./activitySentence";

const item = (
  action: string,
  meta: Record<string, unknown> | null,
  extra: Partial<ActivityItem> = {}
): ActivityItem => ({
  id: "a1",
  action,
  meta,
  createdAt: "2026-11-23T10:00:00.000Z",
  actor: { id: "ada", name: "Ada Obi", image: null },
  project: { id: "p1", name: "Website relaunch", colour: "lime" },
  task: { id: "t1", title: "Fix sign-in" },
  ...extra,
});

const say = (action: string, meta: Record<string, unknown> | null, extra?: Partial<ActivityItem>) =>
  activitySentence(item(action, meta, extra), "me");

describe("activitySentence", () => {
  it("reads task events as plain sentences", () => {
    expect(say("task.moved", { title: "Fix sign-in", from: "To do", to: "Done" })).toBe(
      "Ada Obi moved Fix sign-in to Done"
    );
    expect(say("task.completed", { title: "Fix sign-in", to: "Done" })).toBe("Ada Obi moved Fix sign-in to Done");
    expect(say("task.created", { title: "Fix sign-in", column: "To do" })).toBe("Ada Obi created Fix sign-in in To do");
    expect(say("task.deleted", { title: "Old task" }, { task: null })).toBe("Ada Obi deleted Old task");
    expect(say("task.updated", { fields: ["priority", "dueDate"] })).toBe(
      "Ada Obi changed the priority and due date of Fix sign-in"
    );
    expect(say("task.updated", { fields: ["assigneeId"], assignee: { id: "sam", name: "Sam" } })).toBe(
      "Ada Obi assigned Fix sign-in to Sam"
    );
    expect(say("task.updated", { fields: ["assigneeId"], assignee: null })).toBe("Ada Obi unassigned Fix sign-in");
  });

  it("uses the stored title when the task has since been deleted", () => {
    expect(say("task.moved", { title: "Gone now", to: "Review" }, { task: null })).toBe(
      "Ada Obi moved Gone now to Review"
    );
  });

  it("reads column, project, member and invite events", () => {
    expect(say("column.created", { name: "Review" })).toBe("Ada Obi added the column Review");
    expect(say("column.renamed", { from: "QA", to: "Review" })).toBe("Ada Obi renamed the column QA to Review");
    expect(say("column.done_set", { name: "Shipped" })).toBe("Ada Obi made Shipped the done column");
    expect(say("member.joined", { invitedBy: "Alex Morgan" })).toBe(
      "Ada Obi joined Website relaunch · Invited by Alex Morgan"
    );
    expect(say("member.removed", { name: "Sam", unassignedTaskCount: 3 })).toBe(
      "Ada Obi removed Sam · 3 tasks unassigned"
    );
    expect(say("member.invited", { email: "bisi@team.dev" })).toBe("Ada Obi invited bisi@team.dev");
    expect(say("member.invited", { email: "bisi@team.dev", resent: true })).toBe(
      "Ada Obi sent a new invite to bisi@team.dev"
    );
    expect(say("invite.cancelled", { email: "bisi@team.dev" })).toBe("Ada Obi cancelled the invite for bisi@team.dev");
    expect(say("project.created", { name: "Website relaunch" })).toBe("Ada Obi created Website relaunch");
  });

  it("says You for my own events, and 'it' inside the task drawer", () => {
    const mine = item("task.moved", { to: "Done" }, { actor: { id: "me", name: "Alex", image: null } });
    expect(activitySentence(mine, "me")).toBe("You moved Fix sign-in to Done");
    expect(activitySentence(mine, "me", true)).toBe("You moved it to Done");
  });

  it("never breaks on an unknown action or missing details", () => {
    expect(say("something.new", null)).toBe("Ada Obi made a change in Website relaunch");
    expect(say("task.moved", null, { actor: { id: "x", name: null, image: null } })).toBe("Someone moved Fix sign-in");
  });
});
