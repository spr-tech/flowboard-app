"use client";

import { X } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import type { DashboardQuery } from "@/models/validations/dashboardValidation";
import type { DueGroupKey, MyTask } from "@/models/responses/dashboardResponses";
import { useMyTasks } from "@/services/dashboardService";
import { useProjects } from "@/services/projectsService";
import { cn } from "@/utilities/helpers/cn";
import { DASHBOARD_FILTER_LABELS, groupsForFilter, type DashboardFilter } from "@/utilities/helpers/dashboardFilter";
import { mostRecentlyOpened } from "@/utilities/helpers/projectOrder";
import { DashboardCard } from "./dashboardCard";
import { MyTaskRow } from "./myTaskRow";

const GROUP_NAMES: Record<DueGroupKey, { name: string; className: string }> = {
  overdue: { name: "Overdue", className: "text-danger" },
  today: { name: "Today", className: "text-fg-primary" },
  week: { name: "This week", className: "text-fg-primary" },
  later: { name: "Later", className: "text-fg-secondary" },
  none: { name: "No due date", className: "text-fg-secondary" },
};

/** What a stat-card filter says when nothing matches. */
const NO_MATCHES: Record<Exclude<DashboardFilter, "all">, string> = {
  overdue: "No overdue tasks",
  week: "Nothing due this week",
  done: "Nothing completed this week",
};

type MyTasksSectionProps = { day: DashboardQuery; filter: DashboardFilter; onClearFilter: () => void };

/** My tasks grouped Overdue / Today / This week / Later / No due date, or the stat card's filter. */
export function MyTasksSection({ day, filter, onClearFilter }: MyTasksSectionProps) {
  const { data, isLoading, isError, refetch } = useMyTasks(day);
  const { data: projects } = useProjects();
  const lastBoard = mostRecentlyOpened(projects ?? []);

  const groups: { key: string; name: string; className: string; tasks: MyTask[]; isReadOnly?: boolean }[] =
    filter === "done"
      ? [
          {
            key: "done",
            name: "Completed this week",
            className: "text-status-done-fg",
            tasks: data?.completedThisWeek ?? [],
            isReadOnly: true,
          },
        ].filter((group) => group.tasks.length > 0)
      : (data?.groups ?? [])
          .filter((group) => groupsForFilter(filter).includes(group.key))
          .map((group) => ({ ...group, ...GROUP_NAMES[group.key] }));

  return (
    <DashboardCard
      id="dashboard-my-tasks"
      title="My tasks"
      loadingLabel="Loading your tasks"
      isLoading={isLoading}
      isError={isError && !data}
      onRetry={() => void refetch()}
      action={
        filter !== "all" && (
          <button
            type="button"
            onClick={onClearFilter}
            aria-label={`Clear the ${DASHBOARD_FILTER_LABELS[filter]} filter`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-surface-inverse px-3 py-1 text-[13px] font-semibold text-fg-on-inverse"
          >
            {DASHBOARD_FILTER_LABELS[filter]}
            <X aria-hidden className="size-3.5" />
          </button>
        )
      }
      skeleton={
        <div aria-hidden className="flex flex-col gap-3">
          {[0, 1, 2, 3, 4].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-6 rounded-lg" />
              <Skeleton className={cn("h-4", row % 2 ? "w-2/5" : "w-3/5")} />
              <Skeleton className="ml-auto h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      }
    >
      {groups.length === 0 && filter !== "all" ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <p className="font-semibold">{NO_MATCHES[filter]}</p>
          <button
            type="button"
            onClick={onClearFilter}
            className="cursor-pointer text-sm font-semibold text-fg-secondary underline underline-offset-4 hover:text-fg-primary"
          >
            Show all
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="max-w-xs text-fg-secondary">
            <strong className="block text-fg-primary">You&apos;re all clear.</strong>
            Nothing is assigned to you right now.
          </p>
          {lastBoard && (
            <ButtonLink href={`/projects/${lastBoard.id}`} text="Open a board" variant="secondary" size="sm" />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <section key={group.key} aria-labelledby={`my-tasks-${group.key}`}>
              <h3
                id={`my-tasks-${group.key}`}
                className={cn("flex items-center gap-2 text-sm font-bold", group.className)}
              >
                {group.name}
                <span className="rounded-full bg-surface-sunken px-2 text-xs font-semibold text-fg-secondary">
                  {group.isReadOnly ? group.tasks.length : group.tasks.filter((task) => !task.completedAt).length}
                </span>
              </h3>
              <ul>
                {group.tasks.map((task) => (
                  <MyTaskRow key={task.id} task={task} today={day.today} isReadOnly={group.isReadOnly} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
