"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button/button";
import { Dialog } from "@/components/ui/dialog/dialog";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { useMe } from "@/services/accountService";
import { useMembers } from "@/services/membersService";
import { useLeaveProjectMutation } from "@/services/projectsService";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { projectDangerDialogClosed, selectProjectDangerDialog } from "@/stores/uiSlice";

type LeaveProjectDialogProps = { project: Pick<ProjectDetail, "id" | "name"> };

/** Members only (the owner deletes instead). Says how many of my tasks become unassigned. */
export function LeaveProjectDialog({ project }: LeaveProjectDialogProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectProjectDangerDialog) === "leave";
  const close = () => dispatch(projectDangerDialogClosed());
  const [leaveProject, { isLoading }] = useLeaveProjectMutation();
  const { data: me } = useMe();
  const { data: members } = useMembers(project.id, { skip: !isOpen });
  const myTaskCount = members?.find((member) => member.id === me?.id)?.taskCount;

  const tasksLine =
    myTaskCount === undefined
      ? "Your tasks here become unassigned."
      : `Your ${myTaskCount} task${myTaskCount === 1 ? "" : "s"} here become${myTaskCount === 1 ? "s" : ""} unassigned.`;

  const leave = async () => {
    try {
      await leaveProject(project.id).unwrap();
      close();
      toast({ type: "success", message: `You left ${project.name}` });
      router.push("/projects");
    } catch {
      // The base query has shown why; the dialog stays open so they can try again.
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={close}
      title={`Leave ${project.name}?`}
      footer={
        <>
          <Button text="Cancel" variant="outline" onClick={close} />
          <Button text="Leave project" variant="danger" onClick={leave} isLoading={isLoading} />
        </>
      }
    >
      <p className="text-fg-secondary">
        It disappears from your projects. {tasksLine} The owner can invite you again later.
      </p>
    </Dialog>
  );
}
