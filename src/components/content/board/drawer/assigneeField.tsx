"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button/button";
import type { BoardMember, BoardTask } from "@/models/responses/boardResponses";
import { useTakeTaskMutation } from "@/services/tasksService";
import type { PermissionResult } from "@/utilities/helpers/permissions";

type AssigneeFieldProps = {
  id: string;
  projectId: string;
  task: BoardTask;
  members: BoardMember[];
  meId: string | null;
  /** can("task.assignOthers"): the owner, and managers with createAndAssign, get the picker. */
  mayAssign: boolean;
  /** can("task.take") on this task (the take limit included). */
  take: PermissionResult;
  onAssign: (assigneeId: string | null) => void;
  fieldClass: string;
};

/**
 * The assignee. The owner and managers who may assign pick anyone (or nobody). Everyone else sees
 * who it is; on an unassigned task they get "Assign to me", disabled with the reason at the take
 * limit. Members can't unassign themselves or assign anyone else.
 */
export function AssigneeField(props: AssigneeFieldProps) {
  const { id, projectId, task, members, meId, mayAssign, take, onAssign, fieldClass } = props;
  const [takeTask, { isLoading }] = useTakeTaskMutation();

  if (mayAssign) {
    return (
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
    );
  }

  const name = task.assignee ? `${task.assignee.name ?? "Unnamed"}${task.assignee.id === meId ? " (you)" : ""}` : null;
  return (
    <div className="flex flex-col gap-1.5">
      <input id={id} value={name ?? "Unassigned"} readOnly className={`${fieldClass} h-11 bg-surface-sunken`} />
      {!task.assignee && (
        <>
          <Button
            text="Assign to me"
            variant="secondary"
            size="sm"
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
        </>
      )}
    </div>
  );
}
