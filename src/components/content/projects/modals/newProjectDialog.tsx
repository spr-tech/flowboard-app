"use client";

import { useRouter } from "next/navigation";

import { Dialog } from "@/components/ui/dialog/dialog";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { dialogClosed, selectOpenDialog } from "@/stores/uiSlice";
import { NewProjectForm } from "../forms/newProjectForm";

/** Open/closed lives in the UI slice; the form inside unmounts on close, so it starts fresh each time. */
export function NewProjectDialog() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectOpenDialog)?.kind === "newProject";
  const close = () => dispatch(dialogClosed());

  const onCreated = (project: ProjectDetail) => {
    close();
    toast({ type: "success", message: `${project.name} created` });
    router.push(`/projects/${project.id}`);
  };

  return (
    <Dialog isOpen={isOpen} onClose={close} title="New project">
      {isOpen && <NewProjectForm onCreated={onCreated} onCancel={close} />}
    </Dialog>
  );
}
