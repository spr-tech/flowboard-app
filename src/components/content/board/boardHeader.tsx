import Link from "next/link";
import { Settings } from "lucide-react";

import { ProjectTile } from "@/components/content/projects/projectTile";
import { Avatar } from "@/components/ui/avatar/avatar";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { BoardDescription } from "./boardDescription";
import { InviteButton } from "./inviteButton";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Breadcrumb, colour tile, name, description, "N tasks · N done · N members", avatars, Invite (owner), Settings. */
export function BoardHeader({ project }: { project: ProjectDetail }) {
  const doneColumnIds = new Set(project.columns.filter((column) => column.isDone).map((column) => column.id));
  const doneCount = project.tasks.filter((task) => doneColumnIds.has(task.columnId)).length;
  const shown = project.members.slice(0, 4);

  return (
    <div className="flex flex-col gap-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-fg-secondary">
        <Link href="/projects" className="hover:text-fg-primary">
          Projects
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="truncate font-semibold text-fg-primary">
          {project.name}
        </span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectTile name={project.name} colour={project.colour} />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-3xl font-extrabold tracking-tight wrap-break-word">{project.name}</h1>
            <BoardDescription
              projectId={project.id}
              description={project.description}
              isOwner={project.me.role === "OWNER"}
            />
            <p className="text-sm text-fg-muted">
              {plural(project.tasks.length, "task")} · {doneCount} done · {plural(project.members.length, "member")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex" aria-label={plural(project.members.length, "member")}>
            {shown.map((member) => (
              <Avatar
                key={member.id}
                name={member.name ?? "?"}
                imageUrl={member.image}
                size="md"
                className="-mr-2 ring-2 ring-surface-page"
              />
            ))}
          </span>
          {project.me.role === "OWNER" && <InviteButton />}
          <ButtonLink
            href={`/projects/${project.id}/settings`}
            text="Settings"
            variant="secondary"
            startIcon={<Settings aria-hidden />}
          />
        </div>
      </header>
    </div>
  );
}
