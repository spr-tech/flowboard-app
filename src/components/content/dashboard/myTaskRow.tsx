"use client";

import { Check } from "lucide-react";

import { StatusChip } from "@/components/ui/chip/statusChip";
import type { MyTask } from "@/models/responses/dashboardResponses";
import { useMoveTaskMutation } from "@/services/tasksService";
import { PROJECT_COLOUR_STYLES } from "@/utilities/constants/projectColours";
import { cn } from "@/utilities/helpers/cn";
import { formatDueDay } from "@/utilities/helpers/dateLabels";

const PRIORITY_CHIP = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2 days late", "Yesterday", "Today", "Thu", "28 Nov", or "No date". */
export function dueLabel(due: string | null, today: string): { text: string; isLate: boolean } {
  if (!due) return { text: "No date", isLate: false };
  const days = Math.round((Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY_MS);
  if (days === -1) return { text: "Yesterday", isLate: true };
  if (days < -1) return { text: `${-days} days late`, isLate: true };
  const text = formatDueDay(due, today);
  return { text: text.charAt(0).toUpperCase() + text.slice(1), isLate: false };
}

type MyTaskRowProps = {
  task: MyTask;
  today: string;
  /** In the Completed this week list: always ticked, nothing to change. */
  isReadOnly?: boolean;
};

/**
 * Checkbox, title (struck through once done), project, priority, due. Ticking moves the task to
 * its project's done column through the optimistic moveTask: the row strikes through at once and
 * comes back if the server refuses. Unticking moves it back to the project's first column.
 */
export function MyTaskRow({ task, today, isReadOnly = false }: MyTaskRowProps) {
  const [moveTask, { isLoading }] = useMoveTaskMutation();
  const isDone = task.completedAt !== null;
  const due = dueLabel(task.dueDate, today);
  const target = isDone ? task.project.reopenColumnId : task.project.doneColumnId;

  const toggle = () => {
    if (!target) return;
    // Errors: the move is undone in the cache and the base query shows why.
    void moveTask({ projectId: task.project.id, taskId: task.id, columnId: target });
  };

  return (
    <li className="flex items-center gap-3 border-t border-line-subtle py-3 first:border-t-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={isDone}
        aria-label={isDone ? `Mark ${task.title} not done` : `Mark ${task.title} done`}
        disabled={isReadOnly || isLoading || !target}
        onClick={toggle}
        className={cn(
          "inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-lg border-2 transition-colors disabled:cursor-default",
          isDone ? "border-status-done-fg bg-status-done-fg text-fg-on-inverse" : "border-line-strong bg-surface-card"
        )}
      >
        {isDone && <Check aria-hidden className="size-4" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className={cn("block truncate font-semibold", isDone && "text-fg-muted line-through")}>{task.title}</span>
        <span className="flex items-center gap-1.5 text-[13px] text-fg-muted">
          <span aria-hidden className={cn("size-2 rounded-full", PROJECT_COLOUR_STYLES[task.project.colour].fill)} />
          {task.project.name}
        </span>
      </span>
      <StatusChip status={PRIORITY_CHIP[task.priority]} />
      <span
        className={cn(
          "w-24 shrink-0 text-right text-[13px] font-semibold",
          due.isLate && !isDone ? "text-danger" : "text-fg-secondary"
        )}
      >
        {isDone ? "Done" : due.text}
      </span>
    </li>
  );
}
