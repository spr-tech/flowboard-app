"use client";

import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { useTaskActivity } from "@/services/dashboardService";
import { describeActivity } from "@/utilities/helpers/activitySentence";
import { formatRelativeTime } from "@/utilities/helpers/dateLabels";
import { useDelayedFlag } from "@/utilities/hooks/useDelayedFlag";

/** The task drawer's "Recent activity": this task's newest events, "You moved it to Done · 2 hours ago". */
export function TaskHistory({ taskId, meId }: { taskId: string; meId: string | null }) {
  const { data: items, isLoading } = useTaskActivity(taskId);
  const showSkeleton = useDelayedFlag(isLoading);

  return (
    <section aria-labelledby="task-history" aria-busy={isLoading || undefined} className="flex flex-col gap-2.5">
      <h3 id="task-history" className="text-sm font-semibold text-fg-secondary">
        Recent activity
      </h3>
      {isLoading ? (
        <>
          <p role="status" className="sr-only">
            Loading activity
          </p>
          {showSkeleton && [0, 1].map((row) => <Skeleton key={row} className="h-4 w-4/5" />)}
        </>
      ) : !items?.length ? (
        <p className="text-sm text-fg-muted">Nothing yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {items.map((item) => {
            const { actor, text, target, detail } = describeActivity(item, meId, true);
            return (
              <li key={item.id} className="text-sm text-fg-secondary">
                <span className="font-semibold text-fg-primary">{actor}</span> {text}
                {target && <> {target}</>}
                {detail && <> {detail}</>}
                <span className="text-fg-muted"> · {formatRelativeTime(item.createdAt)}</span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
