// RTK Query cache tags (docs/plan/05-state.md).
// A query *provides* tags ("this result is the Me data"); a mutation *invalidates* them ("Me just
// changed"). RTK Query then refetches every query that provided an invalidated tag. Forgetting a
// tag is the classic stale-screen bug: you save, and another list doesn't change until a reload.
// A plain `as const` object rather than a TypeScript enum: same autocomplete, no enum runtime code.
export const ApiTag = {
  Project: "Project",
  Board: "Board",
  Member: "Member",
  Invite: "Invite",
  Dashboard: "Dashboard",
  Activity: "Activity",
  Me: "Me",
  /** A task's notes, by task id. */
  Note: "Note",
  /** /verify-email's status: the address, and when "Resend code" works again. */
  Verification: "Verification",
} as const;

export type ApiTag = (typeof ApiTag)[keyof typeof ApiTag];

export const API_TAGS = Object.values(ApiTag);
