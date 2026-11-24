"use client";

import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { Dialog } from "@/components/ui/dialog/dialog";
import { FormInput } from "@/components/ui/form/formInput";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { deleteProjectSchema } from "@/models/validations/projectValidation";
import { useDeleteProjectMutation } from "@/services/projectsService";
import { useAppDispatch, useAppSelector } from "@/stores/hooks";
import { dialogClosed, selectOpenDialog } from "@/stores/uiSlice";
import { applyApiError } from "@/utilities/helpers/applyApiError";

type DeleteProjectFormValues = z.infer<typeof deleteProjectSchema>;
type DeleteProjectDialogProps = { project: Pick<ProjectDetail, "id" | "name" | "taskCount"> };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** Owner only. Unlocked by typing the project name exactly; then back to /projects. */
export function DeleteProjectDialog({ project }: DeleteProjectDialogProps) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectOpenDialog)?.kind === "deleteProject";
  const close = () => dispatch(dialogClosed());

  return (
    <Dialog isOpen={isOpen} onClose={close} title="Delete this project?">
      {isOpen && <DeleteProjectForm project={project} onCancel={close} />}
    </Dialog>
  );
}

function DeleteProjectForm({ project, onCancel }: DeleteProjectDialogProps & { onCancel: () => void }) {
  const router = useRouter();
  const [deleteProject] = useDeleteProjectMutation();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<DeleteProjectFormValues>({ resolver: zodResolver(deleteProjectSchema), defaultValues: { name: "" } });
  const typed = useWatch({ control, name: "name" });

  const onSubmit = async (values: DeleteProjectFormValues) => {
    try {
      await deleteProject({ projectId: project.id, name: values.name }).unwrap();
      onCancel();
      toast({ type: "success", message: `${project.name} deleted` });
      router.push("/projects");
    } catch (error) {
      applyApiError(error, ["name"], setError);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormFieldset disabled={isSubmitting} className="contents">
        <p className="text-fg-secondary">
          This deletes the board, all {plural(project.taskCount, "task")}, its columns, members and invites, for
          everyone. It can&apos;t be undone.
        </p>
        <FormInput
          control={control}
          name="name"
          label={`Type “${project.name}” to confirm`}
          autoComplete="off"
          autoFocus
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button text="Cancel" variant="outline" onClick={onCancel} />
          <Button
            text="Delete project"
            loadingText="Deleting…"
            type="submit"
            variant="danger"
            disabled={typed.trim() !== project.name}
            isLoading={isSubmitting}
          />
        </div>
      </FormFieldset>
    </form>
  );
}
