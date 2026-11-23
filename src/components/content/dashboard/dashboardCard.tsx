"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button/button";
import { cn } from "@/utilities/helpers/cn";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";

type DashboardCardProps = {
  id: string;
  title: string;
  /** Next to the title, such as "View all" or the filter chip. */
  action?: ReactNode;
  /** Read out while the section loads: "Loading your tasks". */
  loadingLabel: string;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  /** The section's skeleton shapes, shown once loading has taken 200ms. */
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * One dashboard section: a white card with its title. Each section loads on its own, so each
 * has its own skeleton (after 200ms), aria-busy and a way to retry when it fails.
 */
export function DashboardCard(props: DashboardCardProps) {
  const { id, title, action, loadingLabel, isLoading, isError, onRetry, skeleton, children, className } = props;
  const showSkeleton = useDelayedFlag(isLoading);

  return (
    <section
      aria-labelledby={id}
      aria-busy={isLoading || undefined}
      className={cn("flex flex-col gap-4 rounded-card-lg border border-line-subtle bg-surface-card p-5", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        {action}
      </header>
      {isLoading ? (
        <>
          <p role="status" className="sr-only">
            {loadingLabel}
          </p>
          {showSkeleton && skeleton}
        </>
      ) : isError ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-fg-secondary">We couldn&apos;t load this.</p>
          <Button text="Try again" variant="secondary" size="sm" onClick={onRetry} />
        </div>
      ) : (
        children
      )}
    </section>
  );
}
