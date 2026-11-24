"use client";

import type { KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lock } from "lucide-react";

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
  /** In a folded phone column: neither draggable nor a drop target (its box is clipped away). */
  isDisabled?: boolean;
  /** I can't move it to another column (it still reorders within its column, for my view). */
  isLocked?: boolean;
  /** The owner hasn't opened this member's new task yet. */
  isNew?: boolean;
};

export const LOCKED_CARD_LABEL = "You can only move tasks assigned to you.";

/** The card's face, shared by the sortable card and the drag overlay. */
export function TaskCardFace({
  task,
  isInDoneColumn,
  today,
  isLocked = false,
  isNew = false,
}: Omit<TaskCardProps, "onOpen" | "isDisabled">) {
  const due = task.dueDate ? dueChip(task.dueDate, today) : null;
  return (
    <>
      <div className="flex items-center gap-2">
        <StatusChip status={priorityChip[task.priority]} />
        {isNew && (
          <span className="rounded-full bg-badge-new px-2 py-0.5 text-xs font-semibold text-badge-new-fg">New</span>
        )}
        {isLocked && (
          <Lock role="img" aria-label={LOCKED_CARD_LABEL} className="ml-auto size-3.5 shrink-0 text-fg-secondary">
            <title>{LOCKED_CARD_LABEL}</title>
          </Lock>
        )}
      </div>
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
export function TaskCard({ task, isInDoneColumn, today, onOpen, isDisabled = false, isLocked, isNew }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { kind: "card", columnId: task.columnId, title: task.title },
    // Both halves: a plain `true` only stops dragging and leaves it a drop target.
    disabled: { draggable: isDisabled, droppable: isDisabled },
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
      aria-label={`${task.title}${isNew ? ", new" : ""}. Press Enter to open, Space to ${isLocked ? "reorder" : "move"}.`}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "cursor-grab touch-manipulation rounded-card border border-line-subtle bg-surface-card p-3.5 text-left shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <TaskCardFace task={task} isInDoneColumn={isInDoneColumn} today={today} isLocked={isLocked} isNew={isNew} />
    </div>
  );
}
