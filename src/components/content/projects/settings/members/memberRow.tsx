"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar/avatar";
import { Button } from "@/components/ui/button/button";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectMemberResponse } from "@/models/responses/projectResponses";
import { useRemoveMemberMutation } from "@/services/membersService";

type MemberRowProps = {
  projectId: string;
  member: ProjectMemberResponse;
  isMe: boolean;
  /** The viewer owns the project and this row isn't the owner. */
  canRemove: boolean;
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Avatar, name ("(you)" for the viewer), "email · N tasks", role badge. The owner can remove a
 * member after an inline confirmation: "Remove Ada? Their 3 tasks will be unassigned."
 */
export function MemberRow({ projectId, member, isMe, canRemove }: MemberRowProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [removeMember, { isLoading }] = useRemoveMemberMutation();
  const name = member.name?.trim() || member.email;
  const firstName = name.split(/\s+/)[0];

  const remove = async () => {
    try {
      await removeMember({ projectId, userId: member.id }).unwrap();
      toast({ type: "success", message: `${name} removed` });
    } catch {
      // The base query showed why; the row stays.
      setIsConfirming(false);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-2xl p-3">
      <Avatar name={name} imageUrl={member.image} size="lg" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {name}
          {isMe && <span className="font-normal text-fg-muted"> (you)</span>}
        </span>
        <span className="block truncate text-sm text-fg-muted">
          {member.email} · {plural(member.taskCount, "task")}
        </span>
      </span>
      {member.role === "OWNER" ? (
        <span className="rounded-full bg-surface-inverse px-2.5 py-1 text-xs font-semibold text-highlight">Owner</span>
      ) : (
        <span className="rounded-full border border-line-strong px-2.5 py-[3px] text-xs font-semibold text-fg-secondary">
          Member
        </span>
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
      {canRemove && isConfirming && (
        <div
          role="group"
          aria-label={`Confirm removing ${name}`}
          className="flex flex-[1_1_100%] flex-wrap items-center justify-end gap-2 pt-1 text-[13px] text-fg-secondary"
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
