import { Check } from "lucide-react";

import { StatusChip, type ChipStatus } from "@/components/ui/chip/statusChip";
import { cn } from "@/utilities/helpers/cn";
import { cssVars } from "@/utilities/helpers/cssVars";

type PreviewTask = { title: string; status: ChipStatus; isDone?: boolean };

const columns: { title: string; tasks: PreviewTask[]; hasDropSlot?: boolean }[] = [
  {
    title: "To do · 3",
    tasks: [
      { title: "Write pricing page copy", status: "low" },
      { title: "Fix the checkout bug", status: "high" },
    ],
    hasDropSlot: true,
  },
  {
    title: "In progress · 2",
    tasks: [
      { title: "Plan the launch email", status: "medium" },
      { title: "Design the invite email", status: "medium" },
    ],
  },
  {
    title: "Done · 2",
    tasks: [
      { title: "Launch checklist", status: "done", isDone: true },
      { title: "New brand colours", status: "done", isDone: true },
    ],
  },
];

/**
 * A picture of a board, not a real one: it lies back and stands up as it scrolls into view,
 * with one card mid-drag. Hidden from screen readers; the copy around it says what it shows.
 */
export function BoardPreview() {
  return (
    <div aria-hidden className="relative mx-auto mt-14 max-w-240">
      <div
        className="absolute -top-8.5 -left-9 z-30 hidden animate-float items-center gap-2 rounded-[14px] bg-highlight px-4 py-3 text-sm font-semibold text-fg-on-highlight md:flex"
        style={cssVars({ "--r": "-6deg" })}
      >
        <Check className="size-4.5" strokeWidth={2.5} />
        Moved to Done
      </div>
      <div
        className="absolute top-30 -right-10 z-30 hidden animate-float-slow items-center gap-3 rounded-2xl border border-line-subtle bg-surface-card px-4 py-3.5 text-left md:flex"
        style={cssVars({ "--r": "4deg" })}
      >
        <span className="inline-flex size-9.5 items-center justify-center rounded-full bg-status-high text-sm font-semibold text-status-high-fg">
          AO
        </span>
        <span>
          <span className="block text-sm font-semibold">Ada joined the project</span>
          <span className="block text-[13px] text-fg-muted">Invite accepted by email</span>
        </span>
      </div>

      <div className="origin-bottom animate-tilt-on-scroll rounded-card-lg bg-surface-inverse p-3.5 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3 px-2.5 pt-2 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-heading text-lg font-bold text-fg-on-inverse">Website relaunch</span>
            <span className="rounded-full bg-highlight px-2.5 py-0.5 text-xs font-semibold text-fg-on-highlight">
              4 members
            </span>
          </div>
          <div className="flex gap-2 text-[13px]">
            <span className="rounded-full border border-fg-on-inverse/15 px-3 py-1.5 text-fg-muted-on-inverse">
              Board
            </span>
            <span className="rounded-full bg-primary px-3 py-1.5 font-semibold text-fg-on-primary">
              + New task
            </span>
          </div>
        </div>

        <div className="relative grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {columns.map((column) => (
            <div key={column.title} className="rounded-card bg-surface-inverse-raised p-3.5">
              <p className="mb-3 text-[13px] font-medium text-fg-muted-on-inverse">{column.title}</p>
              <div className="flex flex-col gap-2.5">
                {column.tasks.map((task) => (
                  <div key={task.title} className="rounded-xl bg-surface-page p-3.5">
                    <p
                      className={cn(
                        "mb-2.5 text-sm font-semibold",
                        task.isDone && "text-fg-muted line-through",
                      )}
                    >
                      {task.title}
                    </p>
                    <StatusChip status={task.status} />
                  </div>
                ))}
                {column.hasDropSlot && (
                  <div className="h-13.5 rounded-xl border-[1.5px] border-dashed border-fg-on-inverse/20" />
                )}
              </div>
            </div>
          ))}

          {/* The card being dragged, with the pointer holding it. */}
          <div className="absolute top-37.5 left-[30%] hidden w-57.5 -rotate-5 rounded-xl border-2 border-highlight bg-surface-card p-3.5 shadow-2xl md:block">
            <p className="mb-2.5 text-sm font-semibold">Ship the new landing page</p>
            <StatusChip status="high" />
            <svg viewBox="0 0 24 24" className="absolute -right-3.5 -bottom-4 size-6.5">
              <path
                d="M4 3l16 7-7 2-3 7z"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="fill-surface-inverse stroke-surface-card"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
