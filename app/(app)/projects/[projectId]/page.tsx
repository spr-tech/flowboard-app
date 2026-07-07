import { getSingleProject } from "@/app/actions/projects";
import ProjectBoard from "@/components/projects/projectBoard";

type Props = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectBoardPage({ params }: Props) {
  const { projectId } = await params;

  const result = await getSingleProject(projectId);
  if (!result.success) {
    return <div>{result.error}</div>;
  }

  const project = result?.project ?? null;
  if (!project) {
    return <div>Project not found</div>;
  }

  return <ProjectBoard project={project} />;
}
