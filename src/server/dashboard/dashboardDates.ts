// Calendar days for the dashboard. Due dates are days (YYYY-MM-DD, compared with the browser's
// `today`); completedAt is a moment, turned into the browser's local day with its time zone.
// The server never works out "today" itself (docs/plan/03-data-model.md).
import type { DueGroupKey } from "@/models/responses/dashboardResponses";

const DAY_MS = 24 * 60 * 60 * 1000;

const dayToUtc = (day: string) => Date.parse(`${day}T00:00:00Z`);

/** `day` moved by `count` days (negative goes back). */
export function addDays(day: string, count: number): string {
  return new Date(dayToUtc(day) + count * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayToUtc(to) - dayToUtc(from)) / DAY_MS);
}

/** `count` consecutive days starting at `from`. */
export function dayRange(from: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(from, index));
}

/** A stored due date (midnight UTC) as its day. */
export const dueDay = (date: Date) => date.toISOString().slice(0, 10);

/** The day a moment falls on in a time zone ("en-CA" formats as YYYY-MM-DD). */
export function localDay(moment: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    moment
  );
}

/**
 * Which My tasks group a due day belongs to: before today → Overdue; today → Today; the next 6
 * days → This week (so "this week" is a rolling week, the same as the 7-day strip); after that →
 * Later; no date → No due date.
 */
export function dueGroup(due: string | null, today: string): DueGroupKey {
  if (!due) return "none";
  const days = daysBetween(today, due);
  if (days < 0) return "overdue";
  if (days === 0) return "today";
  if (days <= 6) return "week";
  return "later";
}

/**
 * The earliest moment that can still be on `today - (days - 1)` in any zone: completedAt rows
 * from here are fetched, then kept or dropped by their local day. A day of slack covers every
 * offset (UTC−12 to UTC+14).
 */
export function completedSince(today: string, days: number): Date {
  return new Date(dayToUtc(addDays(today, -(days - 1))) - DAY_MS);
}
