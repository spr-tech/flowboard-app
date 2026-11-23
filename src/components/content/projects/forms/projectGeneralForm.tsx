"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormInput } from "@/components/ui/form/formInput";
import { FormTextarea } from "@/components/ui/form/formTextarea";
import { toast } from "@/components/ui/toast/toast";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import {
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  projectGeneralFormSchema,
  type ProjectGeneralFormInput,
  type ProjectGeneralFormValues,
} from "@/models/validations/projectValidation";
import { useUpdateProjectMutation } from "@/services/projectsService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { ColourPicker } from "./colourPicker";

export const DESCRIPTION_PLACEHOLDER = "e.g. Rebuilding the marketing site before the January launch";

type ProjectGeneralFormProps = {
  project: Pick<ProjectDetail, "id" | "name" | "colour" | "description">;
  /** Members see the same fields, disabled, and no buttons. */
  canEdit: boolean;
};

/**
 * Settings › General: name, colour and description. Save is enabled only when something changed,
 * and sends only what changed. The parent remounts this (key) when the saved values change.
 */
export function ProjectGeneralForm({ project, canEdit }: ProjectGeneralFormProps) {
  const [updateProject] = useUpdateProjectMutation();
  const saved: ProjectGeneralFormInput = {
    name: project.name,
    colour: project.colour,
    description: project.description ?? "",
  };
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isSubmitting },
  } = useForm<ProjectGeneralFormInput, unknown, ProjectGeneralFormValues>({
    resolver: zodResolver(projectGeneralFormSchema),
    defaultValues: saved,
  });
  const [name, colour, description] = useWatch({ control, name: ["name", "colour", "description"] });
  const trimmedName = name.trim();
  const nameChanged = trimmedName !== project.name;
  const colourChanged = colour !== project.colour;
  const descriptionChanged = (description ?? "").trim() !== (project.description ?? "");
  const canSave = trimmedName.length > 0 && (nameChanged || colourChanged || descriptionChanged);

  const onSubmit = async (values: ProjectGeneralFormValues) => {
    try {
      await updateProject({
        projectId: project.id,
        ...(nameChanged ? { name: values.name } : {}),
        ...(colourChanged ? { colour: values.colour } : {}),
        ...(descriptionChanged ? { description: values.description } : {}),
      }).unwrap();
      toast({ type: "success", message: "Project updated" });
    } catch (error) {
      applyApiError(error, ["name", "colour", "description"], setError);
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
      <FormTextarea
        control={control}
        name="description"
        label="Description"
        rows={3}
        maxLength={PROJECT_DESCRIPTION_MAX}
        showCount={canEdit}
        placeholder={canEdit ? DESCRIPTION_PLACEHOLDER : "No description"}
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
