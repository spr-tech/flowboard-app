"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import type { DashboardProject } from "@/models/responses/dashboardResponses";
import type { DashboardQuery } from "@/models/validations/dashboardValidation";
import { useDashboardProjects, useTeamActivity } from "@/services/dashboardService";
import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import { describeActivity } from "@/utilities/helpers/activitySentence";
import { cn } from "@/utilities/helpers/cn";
import { formatDueDay, formatRelativeTime } from "@/utilities/helpers/dateLabels";
import { DashboardCard } from "./dashboardCard";

/** "Next due Thu · 2 overdue", "Next due today", "2 overdue", or "No upcoming due dates". */
export function projectNote(project: DashboardProject, today: string) {
  const parts = [
    project.nextDueDate ? `Next due ${formatDueDay(project.nextDueDate, today)}` : null,
    project.overdueCount ? `${project.overdueCount} overdue` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No upcoming due dates";
}

/** Up to 5 of my projects with a progress bar in the project's colour. */
export function ProjectProgress({ day }: { day: DashboardQuery }) {
  const { data, isLoading, isError, refetch } = useDashboardProjects(day);
  return (
    <DashboardCard
      id="dashboard-projects"
      title="Projects"
      action={
        <Link href="/projects" className="text-sm font-semibold text-fg-secondary hover:text-fg-primary">
          View all
        </Link>
      }
      loadingLabel="Loading your projects"
      isLoading={isLoading}
      isError={isError && !data}
      onRetry={() => void refetch()}
      skeleton={
        <div className="flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-2 rounded-full" />
            </div>
          ))}
        </div>
      }
    >
      <ul className="flex flex-col gap-4">
        {data?.map((project) => {
          const percent = project.taskCount ? Math.round((project.doneCount / project.taskCount) * 100) : 0;
          return (
            <li key={project.id}>
              <Link href={`/projects/${project.id}`} className="group flex flex-col gap-1.5 rounded-xl">
                <span className="flex items-center gap-2">
                  <span aria-hidden className={cn("size-2.5 rounded-sm", PROJECT_COLOUR_STYLES[project.colour].fill)} />
                  <span className="min-w-0 flex-1 truncate font-semibold group-hover:underline">{project.name}</span>
                  <span className="text-sm text-fg-secondary">
                    {project.doneCount}/{project.taskCount}
                  </span>
                </span>
                <span
                  role="progressbar"
                  aria-label={`${project.name} progress`}
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="block h-2 overflow-hidden rounded-full bg-surface-sunken"
                >
                  <span
                    className={cn("block h-full rounded-full", PROJECT_COLOUR_STYLES[project.colour].fill)}
                    style={{ width: `${percent}%` }}
                  />
                </span>
                <span className="flex items-center justify-between gap-2 text-[13px] text-fg-muted">
                  <span className={cn(project.overdueCount > 0 && "text-danger")}>
                    {projectNote(project, day.today)}
                  </span>
                  <span className="flex">
                    {project.members.slice(0, 3).map((member) => (
                      <Avatar
                        key={member.id}
                        name={member.name ?? "?"}
                        imageUrl={member.image}
                        size="sm"
                        className="-ml-1.5 ring-2 ring-surface-card"
                      />
                    ))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </DashboardCard>
  );
}

/**
 * Events across my projects, 5 at a time, newest at the top: "Ada moved Fix sign-in to Done ·
 * 2 hours ago". Older and Newer page through them. The first page polls every 30 seconds; an
 * older page stays still, and a "New activity" pill appears if the first page has changed.
 */
export function TeamActivity({ meId }: { meId: string | null }) {
  // The cursors of the pages I've gone back through ([] = the first page). Newer pops one.
  const [cursors, setCursors] = useState<string[]>([]);
  const cursor = cursors.at(-1) ?? null;
  const first = useTeamActivity(null);
  const older = useTeamActivity(cursor ?? "", { skip: cursor === null });
  const { data, isLoading, isError, refetch } = cursor === null ? first : older;
  const nextCursor = data?.nextCursor ?? null;
  // Page 2 starts where page 1 ended when I left it. New rows push page 1's end along, so its
  // nextCursor no longer matches: something new is at the top.
  const hasNewActivity = cursors.length > 0 && first.data !== undefined && first.data.nextCursor !== cursors[0];

  return (
    <DashboardCard
      id="dashboard-activity"
      title="Team activity"
      action={
        hasNewActivity && (
          <button
            type="button"
            onClick={() => setCursors([])}
            className="cursor-pointer rounded-full bg-highlight px-3 py-1 text-[13px] font-semibold text-fg-on-highlight"
          >
            New activity
          </button>
        )
      }
      loadingLabel="Loading team activity"
      isLoading={isLoading}
      isError={isError && !data}
      onRetry={() => void refetch()}
      skeleton={
        <div className="flex flex-col gap-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      }
    >
      {!data?.items.length ? (
        <p className="py-6 text-center text-sm text-fg-secondary">
          When you or your teammates change something, it shows up here.
        </p>
      ) : (
        <>
          <ol aria-live="polite" className="flex flex-col gap-3.5">
            {data.items.map((item) => {
              const { actor, text, target, detail, note } = describeActivity(item, meId);
              const where = note ?? item.project.name;
              return (
                <li key={item.id} className="flex items-start gap-3">
                  <Avatar name={item.actor.name ?? "?"} imageUrl={item.actor.image} size="md" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="text-fg-secondary">
                      <strong className="text-fg-primary">{actor}</strong> {text}
                      {target && <strong className="font-semibold text-fg-primary"> {target}</strong>}
                      {detail && ` ${detail}`}
                    </span>
                    <span className="block text-[13px] text-fg-muted">
                      {where} · {formatRelativeTime(item.createdAt)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
          {(cursors.length > 0 || nextCursor) && (
            <nav aria-label="Team activity pages" className="flex justify-between gap-3">
              <Button
                text="Newer"
                variant="secondary"
                size="sm"
                startIcon={<ChevronLeft aria-hidden />}
                disabled={cursors.length === 0}
                onClick={() => setCursors(cursors.slice(0, -1))}
              />
              <Button
                text="Older"
                variant="secondary"
                size="sm"
                endIcon={<ChevronRight aria-hidden />}
                disabled={!nextCursor}
                onClick={() => nextCursor && setCursors([...cursors, nextCursor])}
              />
            </nav>
          )}
        </>
      )}
    </DashboardCard>
  );
}
