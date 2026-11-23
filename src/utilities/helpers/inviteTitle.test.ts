import { describe, expect, it } from "vitest";

import { inviteTitle } from "./inviteTitle";

describe("inviteTitle", () => {
  it("names the project on a live invite", () => {
    const project = { name: "Website relaunch", colour: "lime", description: null } as const;
    expect(inviteTitle({ state: "valid", email: "ada@team.dev", inviterName: "Sam", project })).toBe(
      "Join Website relaunch"
    );
  });

  it("names the project on an expired invite", () => {
    expect(inviteTitle({ state: "expired", inviterName: "Sam", projectName: "Launch" })).toBe("Join Launch");
  });

  it.each(["used", "cancelled", "invalid"] as const)("stays generic on a %s link", (state) => {
    expect(inviteTitle({ state })).toBe("Join a project");
  });

  it("stays generic when the lookup failed", () => {
    expect(inviteTitle(null)).toBe("Join a project");
  });
});
