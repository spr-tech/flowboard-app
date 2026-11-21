// One schema per form or request, shared by the browser (React Hook Form) and the API routes.
import { z } from "zod";

import { PROJECT_COLOURS } from "@/utilities/enums/projectColours";

export const PROJECT_NAME_MAX = 60;

export const projectNameField = z
  .string()
  .trim()
  .min(1, "Give the project a name")
  .max(PROJECT_NAME_MAX, `Keep the name to ${PROJECT_NAME_MAX} characters or fewer`);

export const projectColourField = z.enum(PROJECT_COLOURS, "Pick one of the 8 colours");

/** New project dialog and POST /api/projects. */
export const createProjectSchema = z.object({
  name: projectNameField,
  colour: projectColourField,
});
export type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

/** Settings › General and PATCH /api/projects/:projectId. Send only what changed. */
export const updateProjectSchema = z
  .object({ name: projectNameField.optional(), colour: projectColourField.optional() })
  .refine((value) => value.name !== undefined || value.colour !== undefined, "Change the name or the colour");

/** The General form always has both fields. */
export const projectGeneralFormSchema = createProjectSchema;
export type ProjectGeneralFormValues = z.infer<typeof projectGeneralFormSchema>;

/** DELETE /api/projects/:projectId: the project name, typed by the owner to confirm. */
export const deleteProjectSchema = z.object({
  name: z.string().trim().min(1, "Type the project name to confirm"),
});

/** Route segment: /api/projects/:projectId. */
export const projectParamsSchema = z.object({
  projectId: z.string().trim().min(1).max(50),
});

/** A calendar day as YYYY-MM-DD that really exists (no 2026-02-30). */
export const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  // Zod still runs this when the regex failed, so it must cope with any string, not just YYYY-MM-DD.
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "That date doesn't exist");

/**
 * GET /api/projects?today=YYYY-MM-DD. "Today" is the viewer's own calendar day, sent by the
 * browser, so overdue and next-due match the viewer's time zone (docs/plan/03-data-model.md).
 */
export const listProjectsQuerySchema = z.object({
  today: isoDateField,
});
