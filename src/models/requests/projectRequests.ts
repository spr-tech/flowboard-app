import type { ProjectColour } from "@/utilities/enums/projectColours";

/** GET /api/projects. */
export type ListProjectsRequest = { today: string };

/** POST /api/projects. */
export type CreateProjectRequest = { name: string; colour: ProjectColour; description?: string | null };

/** PATCH /api/projects/:projectId: only the fields that changed. */
export type UpdateProjectRequest = {
  projectId: string;
  name?: string;
  colour?: ProjectColour;
  description?: string | null;
  memberTakeLimit?: number;
};

/** DELETE /api/projects/:projectId: the typed confirmation. */
export type DeleteProjectRequest = { projectId: string; name: string };
