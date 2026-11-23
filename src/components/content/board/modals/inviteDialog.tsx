"use client";

import { InviteForm } from "@/components/content/projects/forms/inviteForm";
import { Dialog } from "@/components/ui/dialog/dialog";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { dialogClosed, selectOpenDialog } from "@/stores/uiSlice";

/** The board's Invite button (owner only) opens the same form as project settings' Members card. */
export function InviteDialog({ projectId, projectName }: { projectId: string; projectName: string }) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectOpenDialog)?.kind === "invite";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => dispatch(dialogClosed())}
      title={`Invite to ${projectName}`}
      description="They'll get an email with a link that works for 7 days."
    >
      <InviteForm projectId={projectId} tone="light" />
    </Dialog>
  );
}
