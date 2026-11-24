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
import { MembersSection } from "./members/membersSection";
import { TasksSection } from "./tasksSection";
import { ProjectSettingsSkeleton } from "./projectSettingsSkeleton";
import { SETTINGS_SECTIONS, SettingsSection } from "./settingsSection";

const roleLine = { OWNER: "you're the owner", MANAGER: "you're a manager", MEMBER: "you're a member" } as const;

/**
 * /projects/[projectId]/settings (docs/designs/project-settings.md).
 * General, Columns, Tasks, Members (with roles and invites) and the Danger zone. What I may change
 * follows can(); everything else shows as read-only.
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
    <div className="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
        <Link href="/projects" className="hover:text-fg-primary">
          Projects
        </Link>
        <span aria-hidden>/</span>
        <Link href={boardHref} className="min-w-0 wrap-break-word hover:text-fg-primary">
          {project.name}
        </Link>
        <span aria-hidden>/</span>
        <span aria-current="page" className="font-semibold text-fg-primary">
          Settings
        </span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex min-w-0 items-center gap-4">
          <ProjectTile name={project.name} colour={project.colour} />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Project settings</h1>
            <p className="wrap-break-word text-fg-secondary">
              {project.name} · {roleLine[project.me.role]}
            </p>
          </div>
        </div>
        <ButtonLink href={boardHref} text="Back to board" variant="outline" />
      </header>

      {!isOwner && (
        <p role="note" className="rounded-card bg-surface-sunken px-5 py-4 text-sm text-fg-secondary">
          {project.me.role === "MANAGER"
            ? "The owner chooses what you can do as a manager. Settings you can't change are shown as they are, and you can leave the project at the bottom."
            : "Only the owner (and managers, where allowed) can change the name, columns and members. You can see them here, and leave the project at the bottom."}
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

      <SettingsSection {...SETTINGS_SECTIONS.tasks}>
        <TasksSection key={project.memberTakeLimit} project={project} />
      </SettingsSection>

      <SettingsSection {...SETTINGS_SECTIONS.members}>
        <MembersSection project={project} meId={me?.id ?? null} />
      </SettingsSection>

      <SettingsSection
        {...SETTINGS_SECTIONS.danger}
        description={isOwner ? "Permanent actions. They affect everyone on this board." : "Leaving only affects you."}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="min-w-0">
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
