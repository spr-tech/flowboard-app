// The dashboard's query strings (docs/plan/04-api.md, "Dashboard"). The browser sends its own
// day and its time zone: due dates are calendar days (compared with `today`), but completedAt is
// a moment, so "completed this week" and the 14-day chart need the zone to find its local day.
import { z } from "zod";

import { isoDateField } from "./projectValidation";

/** An IANA zone name such as "Africa/Lagos", checked by actually using it. */
export const timeZoneField = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-CA", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "That time zone doesn't exist");

export const dashboardQuerySchema = z.object({ today: isoDateField, tz: timeZoneField });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/** Team activity rows per page: the dashboard card shows 5. */
export const ACTIVITY_PAGE_SIZE = 5;
const ACTIVITY_PAGE_MAX = 50;

/**
 * Where the next page of team activity starts: the last row of the page before, as
 * "<createdAt ISO>_<id>" (the id breaks ties between rows written in the same millisecond).
 * The browser only passes back the nextCursor it was given.
 */
export const activityCursorField = z
  .string()
  .regex(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)_([A-Za-z0-9-]{1,64})$/, "That cursor isn't valid")
  .transform((value) => {
    const [createdAt, id] = value.split("_");
    return { createdAt: new Date(createdAt), id };
  })
  .refine(({ createdAt }) => !Number.isNaN(createdAt.getTime()), "That cursor isn't valid");

export type ActivityCursor = z.infer<typeof activityCursorField>;

/** GET /api/dashboard/activity?limit=5&cursor=…: newest first; no cursor is the first page. */
export const activityPageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(ACTIVITY_PAGE_MAX).default(ACTIVITY_PAGE_SIZE),
  cursor: activityCursorField.optional(),
});

/** GET /api/me/tasks?group=due: only grouping by due date exists. */
export const myTasksQuerySchema = dashboardQuerySchema.extend({ group: z.literal("due") });
