import { describe, expect, it } from "vitest";

import { inviteNote, maskEmail } from "./inviteLabels";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.parse("2026-11-23T10:00:00.000Z");
const invite = (sentDaysAgo: number) => ({
  sentAt: new Date(now - sentDaysAgo * DAY).toISOString(),
  expiresAt: new Date(now - sentDaysAgo * DAY + 7 * DAY).toISOString(),
});

describe("inviteNote", () => {
  it("counts days since sending and days left", () => {
    expect(inviteNote(invite(0), now)).toEqual({ text: "Sent just now · expires in 7 days", isExpired: false });
    expect(inviteNote(invite(2), now)).toEqual({ text: "Sent 2 days ago · expires in 5 days", isExpired: false });
    expect(inviteNote(invite(6.5), now).text).toBe("Sent 6 days ago · expires in 1 day");
  });

  it("marks an invite expired once its link has run out", () => {
    expect(inviteNote(invite(7), now)).toEqual({ text: "Expired. Resend to send a fresh link.", isExpired: true });
    expect(inviteNote(invite(9), now).isExpired).toBe(true);
  });
});

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    expect(maskEmail("ada@team.dev")).toBe("a***@team.dev");
    expect(maskEmail("x@y.z")).toBe("x***@y.z");
    expect(maskEmail("broken")).toBe("***");
  });
});
