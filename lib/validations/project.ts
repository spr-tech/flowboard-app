import { z } from "zod";

export const editProjectSchema = z.object({
  name: z.string().min(3, "Project name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color"),
  dueDate: z.string().nullable(),
});

export type EditProjectFormValues = z.infer<typeof editProjectSchema>;
