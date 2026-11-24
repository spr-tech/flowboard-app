import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/buttonLink";
import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton/skeleton";
import { SETTINGS_SECTIONS, SettingsSection } from "./settingsSection";

type ProjectSettingsSkeletonProps = {
  projectId: string;
  /** False for the first 200ms: the fixed parts show, the shapes don't yet. */
  showShapes: boolean;
};

/**
 * Project settings while the project loads. The fixed parts are real (breadcrumb, "Project
 * settings", Back to board, section titles and descriptions); what depends on the project (its
 * name, tile, role, the cards' contents) is skeleton shapes.
 */
export function ProjectSettingsSkeleton({ projectId, showShapes }: ProjectSettingsSkeletonProps) {
  const shape = (className: string) => (showShapes ? <Skeleton className={className} /> : null);
  const { general, columns, tasks, members, danger } = SETTINGS_SECTIONS;

  return (
    <SkeletonScreen label="Loading project settings" className="mx-auto flex max-w-5xl flex-col gap-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-fg-secondary">
        <Link href="/projects" className="hover:text-fg-primary">
          Projects
        </Link>
        <span aria-hidden>/</span>
        <span className="inline-flex h-5 w-28 items-center">{shape("h-3.5 w-full")}</span>
        <span aria-hidden>/</span>
        <span aria-current="page" className="font-semibold text-fg-primary">
          Settings
        </span>
      </nav>

      <header className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="size-14 shrink-0">{shape("size-14 rounded-[18px]")}</span>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Project settings</h1>
            <span className="flex h-6 items-center">{shape("h-4 w-52")}</span>
          </div>
        </div>
        <ButtonLink href={`/projects/${projectId}`} text="Back to board" variant="outline" />
      </header>

      <SettingsSection {...general}>
        {showShapes && (
          <div className="flex flex-col gap-5">
            {[
              ["w-28", "h-12"],
              ["w-24", "h-24"],
            ].map(([label, field]) => (
              <div key={label} className="flex flex-col gap-2">
                <Skeleton className={`h-4 ${label}`} />
                <Skeleton className={`${field} rounded-input`} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5">
              {Array.from({ length: 8 }, (_, index) => (
                <Skeleton key={index} className="size-10 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-11 w-36 self-end rounded-full" />
          </div>
        )}
      </SettingsSection>

      <SettingsSection {...columns}>
        {showShapes && (
          <div className="flex flex-col gap-3">
            {["w-24", "w-32", "w-20"].map((name) => (
              <div key={name} className="flex items-center gap-3 rounded-card border border-line-subtle p-3">
                <Skeleton className="size-6" />
                <Skeleton className={`h-4 ${name}`} />
                <Skeleton className="ml-auto h-6 w-20 rounded-full" />
              </div>
            ))}
            <Skeleton className="mt-2 h-10 w-full rounded-card" />
          </div>
        )}
      </SettingsSection>

      <SettingsSection {...tasks}>{showShapes && <Skeleton className="h-9 w-72 rounded-lg" />}</SettingsSection>

      <SettingsSection {...members}>
        {showShapes && (
          <div className="flex flex-col gap-3">
            {["w-36", "w-28"].map((name) => (
              <div key={name} className="flex items-center gap-3 p-1">
                <Skeleton className="size-11 rounded-full" />
                <span className="flex flex-1 flex-col gap-2">
                  <Skeleton className={`h-4 ${name}`} />
                  <Skeleton className="h-3.5 w-52" />
                </span>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        )}
      </SettingsSection>

      <SettingsSection {...danger} description={shape("h-4 w-56")}>
        {showShapes && (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <Skeleton className="h-11 w-36 rounded-full" />
          </div>
        )}
      </SettingsSection>
    </SkeletonScreen>
  );
}
