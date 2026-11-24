"use client";

import { useId, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { useRemoveMemberMutation, useSetMemberRoleMutation } from "@/services/membersService";
import { MANAGER_LIMIT } from "@/utilities/helpers/permissions";
import { PermissionsDialog } from "./permissionsDialog";
import { RoleBadge } from "./roleBadge";

type MemberRowProps = {
  projectId: string;
  member: ProjectMemberResponse;
  isMe: boolean;
  /** can("member.remove") for this person. */
  canRemove: boolean;
  /** The viewer is the owner and this row isn't: the role dropdown and Permissions. */
  canManageRole: boolean;
  /** The project already has 3 managers: a member can't be promoted. */
  managersFull: boolean;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const MANAGER_LIMIT_REASON = `A project can have at most ${MANAGER_LIMIT} managers.`;

/**
 * Avatar, name ("(you)" for the viewer), "email · N tasks", role badge. The owner changes the role
 * (Member / Manager) and, for a manager, opens Permissions. Whoever may remove this person can,
 * after an inline confirmation: "Remove Ada? Their 3 tasks will be unassigned."
 */
export function MemberRow({ projectId, member, isMe, canRemove, canManageRole, managersFull }: MemberRowProps) {
  const roleId = useId();
  const [isConfirming, setIsConfirming] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [removeMember, { isLoading }] = useRemoveMemberMutation();
  const [setRole, { isLoading: isSavingRole }] = useSetMemberRoleMutation();
  const name = member.name?.trim() || member.email;
  const firstName = name.split(/\s+/)[0];
  const promoteBlocked = member.role === "MEMBER" && managersFull;

  const remove = async () => {
    try {
      await removeMember({ projectId, userId: member.id }).unwrap();
      toast({ type: "success", message: `${name} removed` });
    } catch {
      // The base query showed why; the row stays.
      setIsConfirming(false);
    }
  };

  const changeRole = async (role: "MANAGER" | "MEMBER") => {
    try {
      await setRole({ projectId, userId: member.id, role }).unwrap();
      toast({
        type: "success",
        message: role === "MANAGER" ? `${firstName} is now a manager` : `${firstName} is now a member`,
      });
    } catch {
      // The base query showed why; the role stays.
    }
  };

  return (
    <li className="flex flex-col gap-3 rounded-2xl p-3 sm:flex-row sm:flex-wrap sm:items-center">
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar name={name} imageUrl={member.image} size="lg" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold wrap-break-word">
            {name}
            {isMe && <span className="font-normal text-fg-muted"> (you)</span>}
          </span>
          <span className="block text-sm break-all text-fg-muted sm:truncate">
            {member.email} · {plural(member.taskCount, "task")}
          </span>
        </span>
      </span>
      {/* On phones the role and actions sit on their own line, under the name. */}
      <span className="flex flex-wrap items-center gap-2 max-sm:pl-14">
        {canManageRole && member.role !== "OWNER" ? (
          <span className="flex flex-col gap-1 sm:items-end">
            <label htmlFor={roleId} className="sr-only">
              Role for {name}
            </label>
            <select
              id={roleId}
              value={member.role}
              disabled={isSavingRole}
              aria-describedby={promoteBlocked ? `${roleId}-why` : undefined}
              onChange={(event) => void changeRole(event.target.value as "MANAGER" | "MEMBER")}
              className="h-11 rounded-lg border-[1.5px] border-line-strong bg-surface-card px-2 text-sm font-semibold sm:h-9"
            >
              <option value="MEMBER">Member</option>
              <option value="MANAGER" disabled={promoteBlocked}>
                Manager
              </option>
            </select>
            {promoteBlocked && (
              <span id={`${roleId}-why`} className="text-xs text-fg-secondary">
                {MANAGER_LIMIT_REASON}
              </span>
            )}
          </span>
        ) : (
          <RoleBadge role={member.role} />
        )}
        {canManageRole && member.role === "MANAGER" && member.permissions && (
          <>
            <Button
              text="Permissions"
              variant="secondary"
              size="sm"
              startIcon={<SlidersHorizontal aria-hidden />}
              aria-label={`Permissions for ${name}`}
              onClick={() => setShowPermissions(true)}
            />
            <PermissionsDialog
              projectId={projectId}
              userId={member.id}
              name={firstName}
              permissions={member.permissions}
              isOpen={showPermissions}
              onClose={() => setShowPermissions(false)}
            />
          </>
        )}
        {canRemove && !isConfirming && (
          <Button
            text="Remove"
            variant="secondary"
            size="sm"
            className="text-danger"
            aria-label={`Remove ${name}`}
            onClick={() => setIsConfirming(true)}
          />
        )}
      </span>
      {canRemove && isConfirming && (
        <div
          role="group"
          aria-label={`Confirm removing ${name}`}
          className="flex flex-[1_1_100%] flex-wrap items-center gap-2 pt-1 text-[13px] text-fg-secondary sm:justify-end"
        >
          <span>
            Remove {firstName}?
            {member.taskCount > 0 && ` Their ${plural(member.taskCount, "task")} will be unassigned.`}
          </span>
          <Button text="Cancel" variant="secondary" size="sm" onClick={() => setIsConfirming(false)} />
          <Button text="Remove" variant="danger" size="sm" isLoading={isLoading} onClick={() => void remove()} />
        </div>
      )}
    </li>
  );
}
