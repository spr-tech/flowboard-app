"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { NewProjectDialog } from "@/components/content/projects/modals/newProjectDialog";
import { Button } from "@/components/ui/button/button";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton/skeleton";
import { useMe } from "@/services/accountService";
import { useDashboardDay, useDashboardSummary } from "@/services/dashboardService";
import { useAppDispatch } from "@/stores/hooks";
import { dialogClosed, dialogOpened } from "@/stores/uiSlice";
import type { DashboardFilter } from "@/utilities/helpers/dashboardFilter";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";
import { Greeting } from "./greeting";
import { MyTasksSection } from "./myTasksSection";
import { ProjectProgress, TeamActivity } from "./projectsAndActivity";
import { StatCards } from "./statCards";
import { CompletedChart, NextSevenDays, OpenWorkByPriority } from "./statsSections";

/**
 * /dashboard (docs/designs/app-screens.md, "Dashboard"). The summary decides the page: no
 * projects → only "Create your first project"; otherwise every section, each loading on its own.
 * The stat-card filter lives in the URL (?filter=).
 */
export default function DashboardContent({ filter }: { filter: DashboardFilter }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const day = useDashboardDay();
  const { data: summary, isLoading, isError, refetch } = useDashboardSummary(day);
  const { data: me } = useMe();
  const showSkeleton = useDelayedFlag(isLoading);
  const setFilter = (next: DashboardFilter) =>
    router.replace(next === "all" ? "/dashboard" : `/dashboard?filter=${next}`, { scroll: false });

  // A dialog left open (say, by the browser's back button) mustn't reopen on the next visit.
  useEffect(() => () => void dispatch(dialogClosed()), [dispatch]);

  if (isLoading) {
    return (
      <SkeletonScreen label="Loading your dashboard" className="flex flex-col gap-6">
        {showSkeleton && (
          <>
            <Skeleton className="h-12 w-72" />
            <Skeleton className="h-4 w-80" />
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[0, 1, 2, 3].map((card) => (
                <Skeleton key={card} className="h-32 rounded-card-lg" />
              ))}
            </div>
            {/* The sections' places, so nothing jumps when they arrive. */}
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <Skeleton className="h-96 rounded-card-lg" />
              <div className="flex flex-col gap-5">
                <Skeleton className="h-40 rounded-card-lg" />
                <Skeleton className="h-36 rounded-card-lg" />
                <Skeleton className="h-32 rounded-card-lg" />
              </div>
            </div>
          </>
        )}
      </SkeletonScreen>
    );
  }
  if (!summary) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p className="text-fg-secondary">{isError ? "We couldn't load your dashboard." : ""}</p>
        <Button text="Try again" variant="secondary" onClick={() => void refetch()} />
      </div>
    );
  }

  const openNewProject = () => dispatch(dialogOpened({ kind: "newProject" }));

  if (summary.projectCount === 0) {
    return (
      <section className="flex flex-col items-center gap-4 rounded-card-lg border-2 border-dashed border-line-strong px-6 py-20 text-center">
        <h1 className="text-display-section leading-none font-extrabold tracking-tighter">
          Welcome to Flowboard{summary.firstName ? `, ${summary.firstName}` : ""}.
        </h1>
        <p className="max-w-md text-fg-secondary">
          Start with a project. You&apos;ll get a board with To do, In progress and Done, ready for your first task.
        </p>
        <Button text="Create your first project" startIcon={<Plus aria-hidden />} onClick={openNewProject} />
        <NewProjectDialog />
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Greeting summary={summary} hour={new Date().getHours()} />
      <StatCards summary={summary} filter={filter} onFilter={setFilter} />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <MyTasksSection day={day} filter={filter} onClearFilter={() => setFilter("all")} />
        <div className="flex flex-col gap-5">
          <ProjectProgress day={day} />
          <NextSevenDays day={day} />
          <OpenWorkByPriority day={day} />
        </div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <CompletedChart day={day} />
        <TeamActivity meId={me?.id ?? null} />
      </div>
    </div>
  );
}
