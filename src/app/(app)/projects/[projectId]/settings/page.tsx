import type { Metadata } from "next";

import ProjectSettingsContent from "@/components/content/projects/settings/projectSettingsContent";

export const metadata: Metadata = { title: "Project settings · Flowboard" };

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectSettingsContent projectId={projectId} />;
}
