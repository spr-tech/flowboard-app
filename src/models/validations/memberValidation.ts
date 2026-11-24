// Members and invites (docs/plan/04-api.md, "Members and invites"). Shared by the invite form
// and the API routes, so both check the same things.
import { z } from "zod";

import type { ManagerPermissions } from "@/utilities/helpers/permissions";

import { emailField } from "./authValidation";

const idField = z.string().trim().min(1).max(50);

/** POST /api/projects/:projectId/invites, and the invite form. */
export const inviteSchema = z.object({ email: emailField });
export type InviteFormValues = z.infer<typeof inviteSchema>;

export const inviteParamsSchema = z.object({ inviteId: idField });

export const memberParamsSchema = z.object({ projectId: idField, userId: idField });

/** An invite link's token: 32 random bytes in base64url are 43 characters. */
export const inviteTokenParamsSchema = z.object({ token: z.string().trim().min(1).max(200) });

const permissionShape = {
  createAndAssign: z.boolean(),
  editAnyTask: z.boolean(),
  moveAnyTask: z.boolean(),
  teamOrder: z.boolean(),
  manageColumns: z.boolean(),
  deleteAnyTask: z.boolean(),
  deleteColumns: z.boolean(),
  inviteMembers: z.boolean(),
  removeMembers: z.boolean(),
};

/** A manager's switches as stored in ProjectMember.permissions. */
export const managerPermissionsSchema = z.object(permissionShape).strict();

/** PATCH /api/projects/:projectId/members/:userId/permissions (owner): only the switches that changed. */
export const updateManagerPermissionsSchema = z
  .object(permissionShape)
  .partial()
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Change at least one permission");

/** PATCH /api/projects/:projectId/members/:userId (owner): promote or demote. */
export const updateMemberRoleSchema = z.object({
  role: z.enum(["MANAGER", "MEMBER"], "Pick Member or Manager"),
});

/**
 * Stored switches as the code uses them. Anything missing or malformed counts as off, so a bad
 * row can only ever take powers away, never grant them.
 */
export function parseManagerPermissions(value: unknown): ManagerPermissions {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(
    Object.keys(permissionShape).map((key) => [key, source[key] === true])
  ) as ManagerPermissions;
}
