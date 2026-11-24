"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button/button";
import { FormFieldset } from "@/components/ui/form/formFieldset";
import { FormInput } from "@/components/ui/form/formInput";
import type { ProjectDetail } from "@/models/responses/projectResponses";
import { FormTextarea } from "@/components/ui/form/formTextarea";
import {
  createProjectSchema,
  PROJECT_DESCRIPTION_MAX,
  PROJECT_NAME_MAX,
  type CreateProjectFormInput,
  type CreateProjectFormValues,
} from "@/models/validations/projectValidation";
import { useCreateProjectMutation } from "@/services/projectsService";
import { applyApiError } from "@/utilities/helpers/applyApiError";
import { ProjectTile } from "../projectTile";
import { ColourPicker } from "./colourPicker";
import { DESCRIPTION_PLACEHOLDER } from "./projectGeneralForm";

type NewProjectFormProps = {
  onCreated: (project: ProjectDetail) => void;
  onCancel: () => void;
};

/**
 * Name and colour, with a live preview. The same Zod schema checks the POST on the server.
 * Create stays disabled until the name has text.
 */
export function NewProjectForm({ onCreated, onCancel }: NewProjectFormProps) {
  const [createProject] = useCreateProjectMutation();
  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<CreateProjectFormInput, unknown, CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", colour: "vermilion", description: "" },
  });
  const [name, colour, description] = useWatch({ control, name: ["name", "colour", "description"] });
  const trimmedName = name.trim();
  const trimmedDescription = (description ?? "").trim();

  const onSubmit = async (values: CreateProjectFormValues) => {
    try {
      onCreated(await createProject(values).unwrap());
    } catch (error) {
      // Field problems go on the fields; anything else the base query has already toasted.
      applyApiError(error, ["name", "colour", "description"], setError);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <FormFieldset disabled={isSubmitting} className="contents">
        <div
          aria-hidden
          className="flex items-center gap-3.5 rounded-[20px] border border-line-subtle bg-surface-page p-3.5"
        >
          <ProjectTile name={trimmedName || "?"} colour={colour} size="sm" />
          <span className="min-w-0">
            <span className="block font-heading text-xl font-bold wrap-break-word">
              {trimmedName || "Your project"}
            </span>
            {/* The description as you type, instead of "Preview". */}
            <span className="line-clamp-2 block text-[13px] text-fg-muted wrap-break-word">
              {trimmedDescription || "Preview"}
            </span>
          </span>
        </div>

        <FormInput
          control={control}
          name="name"
          label="Project name"
          placeholder="e.g. Website relaunch"
          maxLength={PROJECT_NAME_MAX}
          autoComplete="off"
          autoFocus
        />

        <FormTextarea
          control={control}
          name="description"
          label="Description"
          rows={3}
          maxLength={PROJECT_DESCRIPTION_MAX}
          showCount
          placeholder={DESCRIPTION_PLACEHOLDER}
        />

        <ColourPicker control={control} name="colour" />

        <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button text="Cancel" variant="outline" onClick={onCancel} />
          <Button
            text="Create project"
            loadingText="Creating…"
            type="submit"
            disabled={!trimmedName}
            isLoading={isSubmitting}
          />
        </div>
      </FormFieldset>
    </form>
  );
}
