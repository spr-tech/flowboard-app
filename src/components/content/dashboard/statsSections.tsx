"use client";

import { Skeleton } from "@/components/ui/skeleton/skeleton";
import type { DashboardQuery } from "@/models/validations/dashboardValidation";
import { useDashboardStats } from "@/services/dashboardService";
import { cn } from "@/utilities/helpers/cn";
import { DashboardCard } from "./dashboardCard";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;
const DOT_LIMIT = 4;

/** A YYYY-MM-DD day's weekday and date, read as a calendar day (no time zone shifts). */
const dayParts = (day: string) => {
  const date = new Date(`${day}T00:00:00Z`);
  return {
    dow: date.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }),
    date: date.getUTCDate(),
    long: date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    short: date.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
  };
};

function useStatsCard(day: DashboardQuery) {
  const { data, isLoading, isError, refetch } = useDashboardStats(day);
  return { data, isLoading, isError: isError && !data, onRetry: () => void refetch() };
}

/** Seven days from today, one dot per task of mine due that day; today is dark. */
export function NextSevenDays({ day }: { day: DashboardQuery }) {
  const { data, ...state } = useStatsCard(day);
  return (
    <DashboardCard
      id="dashboard-next-7"
      title="Next 7 days"
      loadingLabel="Loading the next 7 days"
      {...state}
      skeleton={
        <div aria-hidden className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-2xl" />
          ))}
        </div>
      }
    >
      <ol className="grid grid-cols-7 gap-1.5">
        {data?.next7Days.map(({ date, count }, index) => {
          const parts = dayParts(date);
          const isToday = index === 0;
          return (
            <li
              key={date}
              aria-label={`${isToday ? "Today, " : ""}${parts.long}: ${plural(count, "task")} due`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl py-2.5",
                isToday ? "bg-surface-inverse text-fg-on-inverse" : "bg-surface-page"
              )}
            >
              <span className="text-[11px] font-semibold opacity-80">{parts.dow}</span>
              <span className="font-heading text-lg font-bold">{parts.date}</span>
              <span aria-hidden className="flex h-2 items-center gap-0.5">
                {Array.from({ length: Math.min(count, DOT_LIMIT) }, (_, dot) => (
                  <span key={dot} className={cn("size-1.5 rounded-full", isToday ? "bg-highlight" : "bg-primary")} />
                ))}
                {count > DOT_LIMIT && <span className="text-[10px] leading-none font-bold">+</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </DashboardCard>
  );
}

const PRIORITIES = [
  { key: "HIGH", label: "High", className: "bg-primary" },
  { key: "MEDIUM", label: "Medium", className: "bg-project-amber" },
  { key: "LOW", label: "Low", className: "bg-project-blue" },
] as const;

/**
 * My open tasks split by priority: one bar (2px gaps between parts) and a legend with each
 * count, so the colours are never the only way to tell the parts apart.
 */
export function OpenWorkByPriority({ day }: { day: DashboardQuery }) {
  const { data, ...state } = useStatsCard(day);
  const counts = data?.openByPriority;
  const total = counts ? counts.HIGH + counts.MEDIUM + counts.LOW : 0;
  return (
    <DashboardCard
      id="dashboard-priority"
      title="Open work by priority"
      loadingLabel="Loading open work by priority"
      {...state}
      skeleton={
        <div aria-hidden className="flex flex-col gap-3">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 rounded-full" />
        </div>
      }
    >
      <p className="text-sm text-fg-secondary">{plural(total, "open task")} assigned to you</p>
      {total > 0 && counts && (
        <>
          <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {PRIORITIES.filter(({ key }) => counts[key] > 0).map(({ key, className }) => (
              <span key={key} className={cn("h-full", className)} style={{ flexGrow: counts[key] }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-secondary">
            {PRIORITIES.map(({ key, label, className }) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2.5 rounded-full", className)} />
                {label} · <strong className="text-fg-primary">{counts[key]}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </DashboardCard>
  );
}

const CHART_HEIGHT_PX = 110;

/**
 * My completed tasks per day for 14 days: one series, so no legend (the title names it). Bars sit
 * on the baseline with 2px gaps; today's is lime. Each bar has a hover title, and the same numbers
 * are in a list for screen readers.
 */
export function CompletedChart({ day }: { day: DashboardQuery }) {
  const { data, ...state } = useStatsCard(day);
  const days = data?.completedPerDay ?? [];
  const total = days.reduce((sum, { count }) => sum + count, 0);
  const max = Math.max(1, ...days.map(({ count }) => count));
  return (
    <DashboardCard
      id="dashboard-completed"
      title="Completed, last 14 days"
      loadingLabel="Loading completed tasks"
      {...state}
      skeleton={<Skeleton className="h-32 rounded-2xl" />}
    >
      <p className="text-sm text-fg-secondary">
        <strong className="font-heading text-2xl text-fg-primary">{total}</strong> {total === 1 ? "task" : "tasks"} done
      </p>
      <div
        aria-hidden
        className="flex items-end gap-0.5 border-b border-line-subtle"
        style={{ height: CHART_HEIGHT_PX }}
      >
        {days.map(({ date, count }, index) => (
          <span
            key={date}
            title={`${dayParts(date).short}: ${plural(count, "task")}`}
            className={cn(
              "flex-1 rounded-t-[4px]",
              index === days.length - 1 ? "bg-highlight" : "bg-surface-inverse",
              count === 0 && "opacity-20"
            )}
            style={{ height: Math.max(4, Math.round((count / max) * CHART_HEIGHT_PX)) }}
          />
        ))}
      </div>
      <div aria-hidden className="flex justify-between text-xs text-fg-muted">
        <span>{days[0] ? dayParts(days[0].date).short : ""}</span>
        <span>Today</span>
      </div>
      <ol className="sr-only">
        {days.map(({ date, count }) => (
          <li key={date}>
            {dayParts(date).long}: {plural(count, "task")} completed
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}
