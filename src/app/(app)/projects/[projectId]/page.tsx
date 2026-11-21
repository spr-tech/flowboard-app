import ProjectBoardContent from "@/components/content/projects/projectBoardContent";

export default async function Page({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectBoardContent projectId={projectId} />;
}
