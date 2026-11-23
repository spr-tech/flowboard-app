import RebuildingContent from "@/components/content/rebuilding/rebuildingContent";
import { projectNameOrNotFound } from "@/server/projects/projectPage";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  await projectNameOrNotFound(projectId);
  return <RebuildingContent />;
}
