// Members and invites (docs/plan/04-api.md, "Members and invites"). Shared by the invite form
// and the API routes, so both check the same things.
import { z } from "zod";

import { emailField } from "./authValidation";

const idField = z.string().trim().min(1).max(50);

/** POST /api/projects/:projectId/invites, and the invite form. */
export const inviteSchema = z.object({ email: emailField });
export type InviteFormValues = z.infer<typeof inviteSchema>;

export const inviteParamsSchema = z.object({ inviteId: idField });

export const memberParamsSchema = z.object({ projectId: idField, userId: idField });

/** An invite link's token: 32 random bytes in base64url are 43 characters. */
export const inviteTokenParamsSchema = z.object({ token: z.string().trim().min(1).max(200) });
