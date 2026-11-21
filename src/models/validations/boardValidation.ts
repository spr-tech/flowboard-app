// Tasks and columns: one schema per form or request, shared by the browser and the API routes.
import { z } from "zod";

import { isoDateField } from "./projectValidation";

export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 5000;
export const COLUMN_NAME_MAX = 40;

const idField = z.string().trim().min(1).max(50);

export const taskTitleField = z
  .string()
  .trim()
  .min(1, "Give the task a title")
  .max(TASK_TITLE_MAX, `Keep the title to ${TASK_TITLE_MAX} characters or fewer`);

export const columnNameField = z
  .string()
  .trim()
  .min(1, "Give the column a name")
  .max(COLUMN_NAME_MAX, `Keep the name to ${COLUMN_NAME_MAX} characters or fewer`);

export const taskPriorityField = z.enum(["LOW", "MEDIUM", "HIGH"], "Pick low, medium or high");

/** Route segments. */
export const taskParamsSchema = z.object({ taskId: idField });
export const columnParamsSchema = z.object({ columnId: idField });

/** Quick add and POST /api/projects/:projectId/tasks. */
export const createTaskSchema = z.object({ title: taskTitleField, columnId: idField });
export type CreateTaskFormValues = z.infer<typeof createTaskSchema>;

/** The task drawer and PATCH /api/tasks/:taskId: only what changed; null clears a field. */
export const updateTaskSchema = z
  .object({
    title: taskTitleField.optional(),
    description: z
      .string()
      .max(TASK_DESCRIPTION_MAX, `Keep the description to ${TASK_DESCRIPTION_MAX} characters or fewer`)
      .nullable()
      .optional(),
    priority: taskPriorityField.optional(),
    assigneeId: idField.nullable().optional(),
    dueDate: isoDateField.nullable().optional(),
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), "Change at least one field");

/**
 * PATCH /api/tasks/:taskId/move. `afterTaskId` is the card it lands below, `beforeTaskId` the
 * one it lands above (both in the target column). No position: the server works it out.
 */
export const moveTaskSchema = z.object({
  columnId: idField,
  afterTaskId: idField.optional(),
  beforeTaskId: idField.optional(),
});

/** Add column and POST /api/projects/:projectId/columns. */
export const createColumnSchema = z.object({ name: columnNameField });

/** PATCH /api/columns/:columnId: rename, or become the done column. */
export const updateColumnSchema = z
  .object({ name: columnNameField.optional(), isDone: z.literal(true).optional() })
  .refine((value) => value.name !== undefined || value.isDone !== undefined, "Change the name or the done column");

/**
 * PATCH /api/columns/:columnId/move (owner): the team order. `afterColumnId` is the column it
 * lands to the right of, `beforeColumnId` the one it lands to the left of. No position.
 */
export const moveColumnSchema = z.object({ afterColumnId: idField.optional(), beforeColumnId: idField.optional() });

/** PUT /api/projects/:projectId/column-order: my own left-to-right order, as column ids. */
export const columnOrderSchema = z.object({
  columnIds: z
    .array(idField)
    .max(100)
    .refine((ids) => new Set(ids).size === ids.length, "Each column can appear only once"),
});

/** DELETE /api/columns/:columnId: move its tasks to another column, or confirm with its exact name. */
export const deleteColumnSchema = z.union([
  z.object({ moveTasksTo: idField }).strict(),
  z.object({ confirmName: z.string().trim().min(1, "Type the column name to confirm") }).strict(),
]);
export type DeleteColumnRequestBody = z.infer<typeof deleteColumnSchema>;
