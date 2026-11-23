import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton/skeleton";

const CARD_COUNT = 6;

/** The "N projects · N you own" line while the list loads. */
export function ProjectCountSkeleton() {
  return <Skeleton className="mt-3.5 h-4 w-48" />;
}

/**
 * The projects grid while the list loads: six card shapes in the real grid (tile and badge, name,
 * "Updated" line, progress, avatars). The status is there from the start; the shapes only once
 * the load has taken 200ms (`showShapes`), so a fast load shows nothing.
 */
export function ProjectGridSkeleton({ showShapes }: { showShapes: boolean }) {
  return (
    <SkeletonScreen label="Loading your projects">
      {showShapes && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-5">
          {Array.from({ length: CARD_COUNT }, (_, index) => (
            <div
              key={index}
              aria-hidden
              className="flex min-h-[260px] flex-col rounded-card-lg border border-line-subtle bg-surface-card p-[22px]"
            >
              <div className="flex items-start justify-between">
                <Skeleton className="size-14 rounded-[18px]" />
                <Skeleton className="mr-[52px] h-6 w-16 rounded-full" />
              </div>
              <Skeleton className={index % 2 === 0 ? "mt-[18px] h-7 w-3/5" : "mt-[18px] h-7 w-2/5"} />
              <Skeleton className="mt-2.5 h-4 w-28" />
              <div className="mt-auto pt-[22px]">
                <div className="mb-2 flex justify-between">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-3.5 w-8" />
                </div>
                <Skeleton className="h-2 rounded-full" />
                <div className="mt-4 flex">
                  {[0, 1, 2].map((avatar) => (
                    <Skeleton key={avatar} className="-mr-2 size-8 rounded-full ring-2 ring-surface-card" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SkeletonScreen>
  );
}
