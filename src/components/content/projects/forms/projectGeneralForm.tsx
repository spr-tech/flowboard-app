"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import {
  PROJECT_NAME_MAX,
  projectGeneralFormSchema,
  type ProjectGeneralFormValues,
} from "@/models/validations/projectValidation";
import { useUpdateProjectMutation } from "@/services/projectsService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { ColourPicker } from "./colourPicker";

type ProjectGeneralFormProps = {
  project: Pick<ProjectDetail, "id" | "name" | "colour">;
  /** Members see the same fields, disabled, and no buttons. */
  canEdit: boolean;
};

/**
 * Settings › General: name and colour. Save is enabled only when something changed, and sends
 * only what changed. The parent remounts this (key) when the saved values change.
 */
export function ProjectGeneralForm({ project, canEdit }: ProjectGeneralFormProps) {
  const [updateProject] = useUpdateProjectMutation();
  const saved: ProjectGeneralFormValues = { name: project.name, colour: project.colour };
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<ProjectGeneralFormValues>({
    resolver: zodResolver(projectGeneralFormSchema),
    defaultValues: saved,
  });
  const [name, colour] = useWatch({ control, name: ["name", "colour"] });
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== project.name;
  const colourChanged = colour !== project.colour;
  const canSave = trimmedName.length > 0 && (nameChanged || colourChanged);

  const onSubmit = async (values: ProjectGeneralFormValues) => {
    try {
      await updateProject({
        projectId: project.id,
        ...(nameChanged ? { name: values.name } : {}),
        ...(colourChanged ? { colour: values.colour } : {}),
      }).unwrap();
      toast({ type: "success", message: "Project updated" });
    } catch (error) {
      applyApiError(error, ["name", "colour"], setError);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormInput
        control={control}
        name="name"
        label="Project name"
        maxLength={PROJECT_NAME_MAX}
        autoComplete="off"
        disabled={!canEdit}
      />
      <ColourPicker control={control} name="colour" disabled={!canEdit} />
      {canEdit && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button text="Cancel" variant="ghost" onClick={() => reset(saved)} disabled={!canSave || isSubmitting} />
          <Button text="Save changes" type="submit" disabled={!canSave} isLoading={isSubmitting} />
        </div>
      )}
    </form>
  );
}
