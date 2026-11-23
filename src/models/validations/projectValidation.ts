// One schema per form or request, shared by the browser (React Hook Form) and the API routes.
import { z } from "zod";

import { PROJECT_COLOURS } from "@/utilities/enums/projectColours";
import { TAKE_LIMIT_MAX, TAKE_LIMIT_MIN } from "@/utilities/helpers/permissions";

export const PROJECT_NAME_MAX = 60;

export const projectNameField = z
  .string()
  .trim()
  .min(1, "Give the project a name")
  .max(PROJECT_NAME_MAX, `Keep the name to ${PROJECT_NAME_MAX} characters or fewer`);

export const projectColourField = z.enum(PROJECT_COLOURS, "Pick one of the 8 colours");

export const PROJECT_DESCRIPTION_MAX = 200;

/** Optional. Trimmed; empty becomes null, so "no description" is stored one way only. */
export const projectDescriptionField = z
  .string()
  .trim()
  .max(PROJECT_DESCRIPTION_MAX, `Keep the description to ${PROJECT_DESCRIPTION_MAX} characters or fewer`)
  .transform((value) => (value === "" ? null : value))
  .nullable();

export const memberTakeLimitField = z
  .number("Enter a number")
  .int("Enter a whole number")
  .min(TAKE_LIMIT_MIN, `At least ${TAKE_LIMIT_MIN}`)
  .max(TAKE_LIMIT_MAX, `At most ${TAKE_LIMIT_MAX}`);

/** New project dialog and POST /api/projects. */
export const createProjectSchema = z.object({
  name: projectNameField,
  colour: projectColourField,
  description: projectDescriptionField.optional(),
});
/** What the form holds (description is text) and what it submits (empty description → null). */
export type CreateProjectFormInput = z.input<typeof createProjectSchema>;
export type CreateProjectFormValues = z.output<typeof createProjectSchema>;

/**
 * PATCH /api/projects/:projectId (owner): Settings › General (name, colour, description) and
 * Settings › Tasks (the take limit). Send only what changed.
 */
export const updateProjectSchema = z
  .object({
    name: projectNameField.optional(),
    colour: projectColourField.optional(),
    description: projectDescriptionField.optional(),
    memberTakeLimit: memberTakeLimitField.optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Change at least one setting");

/** The General form always has all three fields. */
export const projectGeneralFormSchema = z.object({
  name: projectNameField,
  colour: projectColourField,
  description: projectDescriptionField,
});
export type ProjectGeneralFormInput = z.input<typeof projectGeneralFormSchema>;
export type ProjectGeneralFormValues = z.output<typeof projectGeneralFormSchema>;

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
