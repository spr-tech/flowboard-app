import Link from "next/link";

import { Avatar } from "@/components/ui/avatar/avatar";
import type { ProjectSummary } from "@/models/responses/projectResponses";
import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import { cn } from "@/utilities/helpers/cn";
import { formatDueDay, formatRelativeTime } from "@/utilities/helpers/dateLabels";
import { PinToggle } from "./pinToggle";
import { ProjectTile } from "./projectTile";

type ProjectCardProps = {
  project: ProjectSummary;
  /** The viewer's day (YYYY-MM-DD), for "Next due today". */
  today: string;
  pinnedCount: number;
};

/** One project on the projects page: the whole card links to the board; the pin toggle sits on top. */
export function ProjectCard({ project, today, pinnedCount }: ProjectCardProps) {
  const { id, name, colour, taskCount, doneCount, overdueCount, nextDueDate, members, memberCount, me } = project;
  const percent = taskCount === 0 ? 0 : Math.round((doneCount / taskCount) * 100);
  const isOwner = me.role === "OWNER";
  const hiddenMembers = memberCount - members.length;

  return (
    <div className="relative flex">
      <Link
        href={`/projects/${id}`}
        className="flex min-h-[260px] min-w-0 flex-1 flex-col rounded-card-lg border border-line-subtle bg-surface-card p-[22px] transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        <div className="flex items-start justify-between gap-3 pr-[52px]">
          <ProjectTile name={name} colour={colour} />
          {isOwner ? (
            <span className="rounded-full bg-surface-inverse px-2.5 py-1 text-xs font-semibold text-highlight">
              Owner
            </span>
          ) : (
            <span className="rounded-full border border-line-strong px-2.5 py-[3px] text-xs font-semibold text-fg-secondary">
              Member
            </span>
          )}
        </div>

        <h2 className="mt-[18px] mb-1 text-2xl font-bold tracking-tight wrap-break-word">{name}</h2>
        {project.description && (
          <p className="mb-1 line-clamp-2 text-sm text-fg-secondary wrap-break-word">{project.description}</p>
        )}
        <p className="text-sm text-fg-muted">Updated {formatRelativeTime(project.updatedAt)}</p>

        <div className="mt-auto pt-[22px]">
          <div className="mb-2 flex justify-between text-[13px]">
            <span className="text-fg-secondary">
              {doneCount} of {taskCount} done
            </span>
            <strong>{percent}%</strong>
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-sunken">
            <div
              className={cn("h-full rounded-full", PROJECT_COLOUR_STYLES[colour].fill)}
              style={{ width: `${percent}%` }}
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="flex items-center" aria-label={`${memberCount} member${memberCount === 1 ? "" : "s"}`}>
              {members.map((member) => (
                <Avatar
                  key={member.id}
                  name={member.name ?? "?"}
                  imageUrl={member.image}
                  size="sm"
                  className="-mr-2 ring-2 ring-surface-card"
                />
              ))}
              {hiddenMembers > 0 && (
                <span className="ml-3 text-xs font-semibold text-fg-secondary">+{hiddenMembers}</span>
              )}
            </span>
            {overdueCount > 0 ? (
              <span className="rounded-full bg-status-high px-2.5 py-1 text-xs font-semibold text-status-high-fg">
                {overdueCount} overdue
              </span>
            ) : (
              nextDueDate && (
                <span className="text-xs font-semibold text-fg-secondary">
                  Next due {formatDueDay(nextDueDate, today)}
                </span>
              )
            )}
          </div>
        </div>
      </Link>

      <PinToggle
        projectId={id}
        name={name}
        isPinned={me.pinnedAt !== null}
        pinnedCount={pinnedCount}
        className="absolute top-[18px] right-[18px]"
      />
    </div>
  );
}
