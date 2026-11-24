"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import type { BoardMember, BoardTask } from "@/models/responses/boardResponses";
import { useTakeTaskMutation } from "@/services/tasksService";
import type { PermissionResult } from "@/utilities/helpers/permissions";

type AssigneeFieldProps = {
  id: string;
  labelClass: string;
  projectId: string;
  task: BoardTask;
  members: BoardMember[];
  meId: string | null;
  /** can("task.assignOthers"): the owner, and managers with createAndAssign, get the picker. */
  mayAssign: boolean;
  /** can("task.take") on this task (the take limit included). */
  take: PermissionResult;
  /** Done tasks can't be taken, so they never show "Assign to me". */
  inDoneColumn: boolean;
  onAssign: (assigneeId: string | null) => void;
  fieldClass: string;
};

/**
 * The assignee, with its label. The owner and managers who may assign pick anyone (or nobody).
 * Everyone else sees who it is as plain text; on an unassigned task outside the done column they
 * get a full-width "Assign to me", disabled with the reason at the take limit. Members can't
 * unassign themselves or assign anyone else.
 */
export function AssigneeField(props: AssigneeFieldProps) {
  const { id, labelClass, projectId, task, members, meId, mayAssign, take, inDoneColumn, onAssign, fieldClass } = props;
  const [takeTask, { isLoading }] = useTakeTaskMutation();

  if (mayAssign) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <label htmlFor={id} className={labelClass}>
          Assignee
        </label>
        <select
          id={id}
          value={task.assignee?.id ?? ""}
          onChange={(event) => onAssign(event.target.value || null)}
          className={`${fieldClass} h-11`}
        >
          <option value="">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? "Unnamed"}
              {member.id === meId ? " (you)" : ""}
            </option>
          ))}
        </select>
      </div>
    );
  }

  const name = task.assignee ? `${task.assignee.name ?? "Unnamed"}${task.assignee.id === meId ? " (you)" : ""}` : null;
  const showTake = !task.assignee && !inDoneColumn;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={labelClass}>Assignee</span>
      <span className="text-[15px] wrap-break-word text-fg-primary">{name ?? "Unassigned"}</span>
      {showTake && (
        <div className="mt-1.5 flex flex-col gap-1.5">
          <Button
            text="Assign to me"
            variant="secondary"
            className="w-full"
            startIcon={<UserPlus aria-hidden />}
            isLoading={isLoading}
            disabled={!take.allowed}
            onClick={() =>
              void takeTask({ projectId, taskId: task.id })
                .unwrap()
                .catch(() => undefined)
            }
          />
          {!take.allowed && <p className="text-xs text-fg-secondary">{take.reason}</p>}
        </div>
      )}
    </div>
  );
}
