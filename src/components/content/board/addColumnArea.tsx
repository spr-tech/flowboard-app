"use client";

import type { ProjectDetail } from "@/models/responses/projectResponses";
import { projectCan } from "@/utilities/helpers/projectPermissions";
import { AddColumnForm } from "./forms/addColumnForm";

type AddColumnAreaProps = { project: Pick<ProjectDetail, "id" | "me" | "memberTakeLimit">; meId: string | null };

/**
 * "+ Add column" for whoever may add team columns: the owner, and managers with manageColumns
 * (docs/designs/app-screens.md). Nothing for anyone else.
 */
export function AddColumnArea({ project, meId }: AddColumnAreaProps) {
  if (!projectCan(project, meId, "column.add").allowed) return null;
  return <AddColumnForm projectId={project.id} />;
}
