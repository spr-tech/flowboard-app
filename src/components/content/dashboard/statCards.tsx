"use client";

import type { DashboardSummary } from "@/models/responses/dashboardResponses";
import { cn } from "@/utilities/helpers/cn";
import type { DashboardFilter } from "@/utilities/helpers/dashboardFilter";

type StatCardsProps = {
  summary: DashboardSummary;
  filter: DashboardFilter;
  /** "all" clears the filter. */
  onFilter: (filter: DashboardFilter) => void;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Assigned to me, Due this week, Overdue, Completed this week. Each filters My tasks (the URL
 * keeps it); clicking the active card again, or Assigned to me, clears the filter.
 */
export function StatCards({ summary, filter, onFilter }: StatCardsProps) {
  const cards = [
    {
      key: "all" as const,
      label: "Assigned to me",
      value: summary.assignedOpen,
      caption: `across ${plural(summary.assignedProjectCount, "project")}`,
      valueClass: "text-fg-primary",
    },
    {
      key: "week" as const,
      label: "Due this week",
      value: summary.dueThisWeek,
      caption: "including today",
      valueClass: "text-fg-primary",
    },
    {
      key: "overdue" as const,
      label: "Overdue",
      value: summary.overdue,
      caption:
        summary.oldestOverdueDays !== null
          ? `oldest is ${plural(summary.oldestOverdueDays, "day")} late`
          : "all caught up",
      valueClass: summary.overdue > 0 ? "text-danger" : "text-status-done-fg",
    },
    {
      key: "done" as const,
      label: "Completed this week",
      value: summary.completedThisWeek,
      caption: summary.completedThisWeek > 0 ? "nice momentum" : "none yet this week",
      valueClass: "text-fg-on-highlight",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => {
        const isOn = card.key !== "all" && filter === card.key;
        return (
          <button
            key={card.key}
            type="button"
            aria-pressed={card.key === "all" ? undefined : isOn}
            onClick={() => onFilter(isOn || card.key === "all" ? "all" : card.key)}
            className={cn(
              "flex cursor-pointer flex-col items-start gap-1 rounded-card-lg border-2 p-4 text-left transition-colors",
              card.key === "done" ? "border-highlight bg-highlight" : "border-line-subtle bg-surface-card",
              isOn && "border-fg-primary",
              "hover:border-fg-primary/50"
            )}
          >
            <span className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-fg-secondary">
              {card.label}
              {isOn && (
                <span className="rounded-full bg-surface-inverse px-2 py-0.5 text-[11px] text-fg-on-inverse">
                  Filtering
                </span>
              )}
            </span>
            <span className={cn("font-heading text-4xl font-extrabold tracking-tight", card.valueClass)}>
              {card.value}
            </span>
            <span
              className={cn("text-[13px]", card.key === "done" ? "text-fg-on-highlight-secondary" : "text-fg-muted")}
            >
              {card.caption}
            </span>
          </button>
        );
      })}
    </div>
  );
}
