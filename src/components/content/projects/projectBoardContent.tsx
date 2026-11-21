"use client";

import { Settings } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { useProject } from "@/services/projectsService";
import { ProjectLoadProblem } from "./projectLoadProblem";
import { ProjectTile } from "./projectTile";

/**
 * /projects/[projectId] until the board lands in milestone 6: the project's header and a link to
 * its settings. Loading the project also records the visit, which drives the sidebar's recents.
 */
export default function ProjectBoardContent({ projectId }: { projectId: string }) {
  const { data: project, error, isLoading, refetch } = useProject(projectId);

  if (isLoading) {
    return (
      <p role="status" className="text-fg-secondary">
        Loading project…
      </p>
    );
  }
  if (!project) return <ProjectLoadProblem error={error} onRetry={refetch} />;

  const columnNames = project.columns.map((column) => column.name).join(", ");

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <ProjectTile name={project.name} colour={project.colour} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight wrap-break-word">{project.name}</h1>
            <p className="text-fg-secondary">
              {project.taskCount} task{project.taskCount === 1 ? "" : "s"} · {columnNames}
            </p>
          </div>
        </div>
        <ButtonLink
          href={`/projects/${project.id}/settings`}
          text="Settings"
          variant="secondary"
          startIcon={<Settings aria-hidden />}
        />
      </header>
      <p className="rounded-card bg-surface-sunken px-5 py-4 text-fg-secondary">
        The board is being rebuilt. Its columns and cards come back soon.
      </p>
    </section>
  );
}
