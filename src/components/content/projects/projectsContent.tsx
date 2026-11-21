"use client";

import { useEffect } from "react";
import { Pin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import { useProjects } from "@/services/projectsService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogClosed, dialogOpened } from "@/stores/uiSlice";
import { localToday } from "@/utilities/helpers/localToday";
import { countPinned, filterProjects, sortForProjectsPage, type ProjectFilter } from "@/utilities/helpers/projectOrder";
import { NewProjectDialog } from "./modals/newProjectDialog";
import { ProjectCard } from "./projectCard";
import { ProjectFilterTabs } from "./projectFilterTabs";

const emptyTabMessages: Record<ProjectFilter, string> = {
  all: "",
  owned: "You don't own any projects yet.",
  shared: "Nobody has shared a project with you yet.",
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** /projects: my projects as cards, pinned first, filtered by ?filter= (docs/designs/app-screens.md). */
export default function ProjectsContent({ filter }: { filter: ProjectFilter }) {
  const dispatch = useAppDispatch();
  const openNewProject = () => dispatch(dialogOpened({ kind: "newProject" }));
  // A dialog left open (say, by the browser's back button) mustn't reopen on the next visit.
  useEffect(() => () => void dispatch(dialogClosed()), [dispatch]);
  const { data: projects, isLoading, isError, refetch } = useProjects();
  const today = localToday();

  const ownedCount = projects?.filter((project) => project.me.role === "OWNER").length ?? 0;
  const shown = sortForProjectsPage(filterProjects(projects ?? [], filter));
  const pinnedCount = countPinned(projects ?? []);

  return (
    <section className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-display-section leading-none font-extrabold tracking-tighter">Projects</h1>
          {projects && projects.length > 0 && (
            <p className="mt-2.5 text-fg-secondary">
              {plural(projects.length, "project")} · {ownedCount} you own
            </p>
          )}
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-fg-muted">
            <Pin aria-hidden className="size-3.5" />
            Pinned projects come first. Your first 3 pins show in the sidebar.
          </p>
        </div>
        <Button text="New project" startIcon={<Plus aria-hidden />} onClick={openNewProject} />
      </header>

      <ProjectFilterTabs active={filter} />

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          <p className="sr-only" role="status">
            Loading your projects
          </p>
          {[0, 1, 2].map((key) => (
            <div key={key} aria-hidden className="h-[260px] animate-pulse rounded-card-lg bg-surface-sunken" />
          ))}
        </div>
      ) : isError && !projects ? (
        <div className="flex flex-col items-start gap-4 rounded-card-lg border border-line-subtle bg-surface-card p-6">
          <p className="text-fg-secondary">We couldn&apos;t load your projects.</p>
          <Button text="Try again" variant="secondary" onClick={() => refetch()} />
        </div>
      ) : projects && projects.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-card-lg border-2 border-dashed border-line-strong px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">Create your first project</h2>
          <p className="max-w-md text-fg-secondary">
            A project is a board for one piece of work. It starts with To do, In progress and Done.
          </p>
          <Button text="New project" startIcon={<Plus aria-hidden />} onClick={openNewProject} />
        </div>
      ) : (
        <>
          {shown.length === 0 && <p className="text-fg-secondary">{emptyTabMessages[filter]}</p>}
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
            {shown.map((project) => (
              <li key={project.id} className="flex">
                <ProjectCard project={project} today={today} pinnedCount={pinnedCount} />
              </li>
            ))}
            <li className="flex">
              <button
                type="button"
                onClick={openNewProject}
                className="flex min-h-[260px] flex-1 cursor-pointer flex-col items-center justify-center gap-3 rounded-card-lg border-2 border-dashed border-line-strong text-fg-secondary transition-colors hover:bg-surface-sunken"
              >
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-highlight text-fg-on-highlight">
                  <Plus aria-hidden className="size-6" />
                </span>
                <span className="text-base font-semibold text-fg-primary">New project</span>
                <span className="text-[13px]">Starts with To do, In progress and Done</span>
              </button>
            </li>
          </ul>
        </>
      )}

      <NewProjectDialog />
    </section>
  );
}
