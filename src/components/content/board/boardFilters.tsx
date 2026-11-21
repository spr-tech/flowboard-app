"use client";

import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import {
  boardPriorityFilterChanged,
  onlyMyTasksToggled,
  selectBoardPriorityFilter,
  selectOnlyMyTasks,
  type BoardPriorityFilter,
} from "@/stores/uiSlice";
import { cn } from "@/utilities/helpers/cn";

const pills: { value: BoardPriorityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const pill = (isOn: boolean) =>
  cn(
    "min-h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition-colors",
    isOn ? "bg-surface-inverse text-fg-on-inverse" : "text-fg-secondary hover:text-fg-primary"
  );

/** Priority pills and "Only my tasks" (in uiSlice; reset when the board is left). */
export function BoardFilters() {
  const dispatch = useAppDispatch();
  const priority = useAppSelector(selectBoardPriorityFilter);
  const onlyMine = useAppSelector(selectOnlyMyTasks);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="group"
        aria-label="Filter by priority"
        className="inline-flex gap-1 rounded-full bg-surface-sunken p-1"
      >
        {pills.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={priority === value}
            onClick={() => dispatch(boardPriorityFilterChanged(value))}
            className={pill(priority === value)}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={onlyMine}
        onClick={() => dispatch(onlyMyTasksToggled())}
        className={cn(pill(onlyMine), !onlyMine && "border border-line-strong")}
      >
        Only my tasks
      </button>
      <p className="text-sm text-fg-muted">Drag cards between columns, or open one and change its column.</p>
    </div>
  );
}
