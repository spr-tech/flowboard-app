// The dashboard's stat-card filter, kept in the URL (?filter=overdue) so it can be shared.

export const DASHBOARD_FILTERS = ["week", "overdue", "done"] as const;
export type DashboardFilter = (typeof DASHBOARD_FILTERS)[number] | "all";

export const DASHBOARD_FILTER_LABELS: Record<Exclude<DashboardFilter, "all">, string> = {
  week: "Due this week",
  overdue: "Overdue",
  done: "Completed this week",
};

/** Anything unknown (or missing) means no filter. */
export function toDashboardFilter(value: string | undefined): DashboardFilter {
  return DASHBOARD_FILTERS.find((filter) => filter === value) ?? "all";
}

/** Which My tasks groups a filter shows ("done" shows the week's completions instead). */
export function groupsForFilter(filter: DashboardFilter) {
  if (filter === "overdue") return ["overdue"];
  if (filter === "week") return ["today", "week"];
  return ["overdue", "today", "week", "later", "none"];
}
