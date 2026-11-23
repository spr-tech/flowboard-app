/**
 * The browser's own calendar day as YYYY-MM-DD, sent as ?today= (docs/plan/03-data-model.md).
 * Built from the local year, month and day: toISOString() would give the UTC date, which in
 * New York after 7 pm is already tomorrow.
 */
export function localToday(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
