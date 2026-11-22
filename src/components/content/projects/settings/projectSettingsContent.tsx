"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button/button";
import { ButtonLink } from "@/components/ui/button/buttonLink";
import { useMe } from "@/services/accountService";
import { useProject } from "@/services/projectsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogClosed, dialogOpened } from "@/stores/uiSlice";
import { ProjectGeneralForm } from "../forms/projectGeneralForm";
import { DeleteProjectDialog } from "../modals/deleteProjectDialog";
import { LeaveProjectDialog } from "../modals/leaveProjectDialog";
import { ProjectLoadProblem } from "../projectLoadProblem";
import { ProjectTile } from "../projectTile";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";
import { ColumnsSection } from "./columnsSection";
import { ProjectSettingsSkeleton } from "./projectSettingsSkeleton";
import { SETTINGS_SECTIONS, SettingsSection } from "./settingsSection";

/**
 * /projects/[projectId]/settings (docs/designs/project-settings.md).
 * General, Columns and the Danger zone; members and invites arrive in milestone 7.
 */
export default function ProjectSettingsContent({ projectId }: { projectId: string }) {
  const dispatch = useAppDispatch();
  const { data: project, error, isLoading, refetch } = useProject(projectId);
  const { data: me } = useMe();

  // A dialog left open (say, by the browser's back button) mustn't reopen on the next visit.
  useEffect(() => () => void dispatch(dialogClosed()), [dispatch]);

  const showSkeleton = useDelayedFlag(isLoading);

  if (isLoading) return <ProjectSettingsSkeleton projectId={projectId} showShapes={showSkeleton} />;
  if (!project) return <ProjectLoadProblem error={error} onRetry={refetch} />;

  const isOwner = project.me.role === "OWNER";
  const boardHref = `/projects/${project.id}`;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
        <Link href="/projects" className="hover:text-fg-primary">
          Projects
        </Link>
        <span aria-hidden>/</span>
        <Link href={boardHref} className="hover:text-fg-primary">
          {project.name}
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="font-semibold text-fg-primary">
          Settings
        </span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <ProjectTile name={project.name} colour={project.colour} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Project settings</h1>
            <p className="text-fg-secondary">
              {project.name} · {isOwner ? "you're the owner" : "you're a member"}
            </p>
          </div>
        </div>
        <ButtonLink href={boardHref} text="Back to board" variant="outline" />
      </header>

      {!isOwner && (
        <p role="note" className="rounded-card bg-surface-sunken px-5 py-4 text-sm text-fg-secondary">
          Only the owner can change the name, colour, columns and members. You can see them here, and leave the project
          at the bottom.
        </p>
      )}

      <SettingsSection {...SETTINGS_SECTIONS.general}>
        <ProjectGeneralForm
          key={`${project.name}|${project.colour}|${project.description ?? ""}`}
          project={project}
          canEdit={isOwner}
        />
      </SettingsSection>

      <SettingsSection {...SETTINGS_SECTIONS.columns}>
        <ColumnsSection project={project} meId={me?.id ?? null} />
      </SettingsSection>

      <SettingsSection
        {...SETTINGS_SECTIONS.danger}
        description={isOwner ? "Permanent actions. They affect everyone on this board." : "Leaving only affects you."}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>
            <span className="block font-semibold">{isOwner ? "Delete this project" : "Leave this project"}</span>
            <span className="block text-sm text-fg-secondary">
              {isOwner
                ? "Deletes the board, its tasks, columns, members and invites for everyone."
                : "It disappears from your projects, and your tasks here become unassigned."}
            </span>
          </span>
          <Button
            text={isOwner ? "Delete project" : "Leave project"}
            variant="danger"
            onClick={() => dispatch(dialogOpened({ kind: isOwner ? "deleteProject" : "leaveProject" }))}
          />
        </div>
      </SettingsSection>

      {isOwner ? <DeleteProjectDialog project={project} /> : <LeaveProjectDialog project={project} />}
    </div>
  );
}
