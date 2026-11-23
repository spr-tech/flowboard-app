import type { Metadata } from "next";

import ProjectSettingsContent from "@/components/content/projects/settings/projectSettingsContent";
import { projectNameOrNotFound } from "@/server/projects/projectPage";

export const metadata: Metadata = { title: "Project settings" };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await projectNameOrNotFound(projectId);
  return <ProjectSettingsContent projectId={projectId} />;
}
