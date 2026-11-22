import { Skeleton, SkeletonScreen } from "@/components/ui/skeleton/skeleton";

/** Card heights per column: 2 to 4 cards of different sizes, so it reads as a real board. */
const COLUMN_CARDS = [
  ["h-24", "h-32"],
  ["h-28", "h-20", "h-36"],
  ["h-22", "h-30", "h-24", "h-28"],
];
const FILTER_PILL_WIDTHS = ["w-14", "w-16", "w-24", "w-20"];

/**
 * The board while it loads, in the real layout: breadcrumb, header (tile, name and summary bars,
 * three avatars), four filter pills, then three columns with a header bar and cards. Columns sit
 * in a row from md up and stack at full width on phones, like the board itself. The status is
 * there from the start; the shapes only once the load has taken 200ms (`showShapes`).
 */
export function BoardSkeleton({ showShapes }: { showShapes: boolean }) {
  return (
    <SkeletonScreen label="Loading the board" className="flex flex-col gap-6">
      {showShapes && (
        <>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-44" />
            <div className="flex flex-wrap items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <Skeleton className="size-14 shrink-0 rounded-[18px]" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-8 w-48 sm:w-64" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
              <div className="flex">
                {[0, 1, 2].map((avatar) => (
                  <Skeleton key={avatar} className="-mr-2 size-9 rounded-full ring-2 ring-surface-page" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTER_PILL_WIDTHS.map((width) => (
              <Skeleton key={width} className={`h-10 rounded-full ${width}`} />
            ))}
          </div>

          <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-start md:gap-4 md:overflow-hidden">
            {COLUMN_CARDS.map((cards, column) => (
              <div
                key={column}
                className="flex w-full flex-col gap-2.5 rounded-card bg-surface-sunken p-3 md:w-[300px] md:shrink-0"
              >
                <div className="flex min-h-9 items-center gap-2 px-1">
                  <Skeleton tone="card" className="h-5 w-28" />
                  <Skeleton tone="card" className="h-4 w-5" />
                </div>
                {cards.map((height, card) => (
                  <Skeleton key={card} tone="card" className={`rounded-card ${height}`} />
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </SkeletonScreen>
  );
}
