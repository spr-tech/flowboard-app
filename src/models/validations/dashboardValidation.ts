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

/** GET /api/me/tasks?group=due: only grouping by due date exists. */
export const myTasksQuerySchema = dashboardQuerySchema.extend({ group: z.literal("due") });
