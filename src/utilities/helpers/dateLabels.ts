// Short date words for cards: "12 minutes ago", "today", "Sat", "20 Nov".

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const plural = (count: number, unit: string) => `${count} ${unit}${count === 1 ? "" : "s"}`;

/** "20 Nov" (in the viewer's zone), with the year only when it isn't this year. */
function shortDate(date: Date, now: Date) {
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/**
 * How long ago an ISO timestamp was: "just now", "12 minutes ago", "1 hour ago", "3 days ago",
 * then the date itself after 4 weeks ("20 Nov"). A time slightly in the future (clocks differ)
 * counts as just now.
 */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const elapsed = now.getTime() - then.getTime();
  if (elapsed < MINUTE) return "just now";
  if (elapsed < HOUR) return `${plural(Math.floor(elapsed / MINUTE), "minute")} ago`;
  if (elapsed < DAY) return `${plural(Math.floor(elapsed / HOUR), "hour")} ago`;
  if (elapsed < 28 * DAY) return `${plural(Math.floor(elapsed / DAY), "day")} ago`;
  return `on ${shortDate(then, now)}`;
}

/** A YYYY-MM-DD calendar day as midnight UTC, so day arithmetic ignores time zones. */
const dayToUtc = (day: string) => new Date(`${day}T00:00:00Z`);

/**
 * A due day relative to the viewer's `today` (both YYYY-MM-DD): "today", "tomorrow", a weekday
 * within the next week ("Sat"), otherwise the date ("20 Nov", or "3 Jan 2027" in another year).
 * Pure calendar arithmetic: no clocks, no time zones.
 */
export function formatDueDay(due: string, today: string): string {
  const dueDate = dayToUtc(due);
  const todayDate = dayToUtc(today);
  const days = Math.round((dueDate.getTime() - todayDate.getTime()) / DAY);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days > 1 && days < 7) return dueDate.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const sameYear = dueDate.getUTCFullYear() === todayDate.getUTCFullYear();
  return dueDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  });
}
