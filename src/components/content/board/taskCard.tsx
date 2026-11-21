"use client";

import type { KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Avatar } from "@/components/ui/avatar/avatar";
import { StatusChip } from "@/components/ui/chip/statusChip";
import type { BoardTask } from "@/models/responses/boardResponses";
import { dueChip } from "@/utilities/helpers/boardView";
import { cn } from "@/utilities/helpers/cn";

const priorityChip = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;

const dueTones = {
  late: "bg-danger text-fg-on-danger",
  today: "bg-surface-inverse text-fg-on-inverse",
  soon: "bg-surface-sunken text-fg-primary",
  later: "bg-surface-sunken text-fg-secondary",
} as const;

type TaskCardProps = {
  task: BoardTask;
  isInDoneColumn: boolean;
  today: string;
  onOpen: (taskId: string) => void;
};

/** The card's face, shared by the sortable card and the drag overlay. */
export function TaskCardFace({ task, isInDoneColumn, today }: Omit<TaskCardProps, "onOpen">) {
  const due = task.dueDate ? dueChip(task.dueDate, today) : null;
  return (
    <>
      <StatusChip status={priorityChip[task.priority]} />
      <p
        className={cn("mt-2.5 text-[15px] leading-snug font-semibold", isInDoneColumn && "text-fg-muted line-through")}
      >
        {task.title}
      </p>
      {(due || task.assignee) && (
        <div className="mt-3 flex items-center justify-between gap-2">
          {due ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                isInDoneColumn ? "bg-status-done text-status-done-fg" : dueTones[due.tone]
              )}
            >
              {due.label}
            </span>
          ) : (
            <span />
          )}
          {task.assignee && <Avatar name={task.assignee.name ?? "?"} imageUrl={task.assignee.image} size="sm" />}
        </div>
      )}
    </>
  );
}

/**
 * A draggable card. Pointer: drag after 6px, otherwise a click opens the drawer. Keyboard: Space
 * picks it up (dnd-kit's keyboard sensor), Enter opens the drawer.
 */
export function TaskCard({ task, isInDoneColumn, today, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { kind: "card", columnId: task.columnId, title: task.title },
  });

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen(task.id);
      return;
    }
    listeners?.onKeyDown?.(event);
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onKeyDown={onKeyDown}
      onClick={() => onOpen(task.id)}
      aria-label={`${task.title}. Press Enter to open, Space to move.`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-manipulation rounded-card border border-line-subtle bg-surface-card p-3.5 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <TaskCardFace task={task} isInDoneColumn={isInDoneColumn} today={today} />
    </div>
  );
}
