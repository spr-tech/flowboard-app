// Members and invites as the API returns them (docs/plan/04-api.md, "Members and invites").
import type { ProjectColour } from "@/utilities/enums/projectColours";

/**
 * A pending invite (expired ones included; the page marks them). Dates are ISO strings.
 * `sentAt` is when its current link was sent (a resend moves it), worked out from `expiresAt`.
 */
export type InviteResponse = {
  id: string;
  email: string;
  sentAt: string;
  expiresAt: string;
};

/** POST /invites and POST /invites/:id/resend. `resent`: a pending invite was sent again. */
export type SentInviteResponse = InviteResponse & { resent: boolean };

export type CancelInviteResponse = { id: string };

export type RemoveMemberResponse = { projectId: string; userId: string; unassignedTaskCount: number };

/** GET /api/invites/token/:token: what an invite link shows before anyone acts on it. */
export type InvitePreview =
  | {
      state: "valid";
      email: string;
      inviterName: string;
      project: { name: string; colour: ProjectColour; description: string | null };
    }
  | { state: "expired"; inviterName: string; projectName: string }
  | { state: "used" | "cancelled" | "invalid" };

export type AcceptInviteResponse = { projectId: string; projectName: string };
