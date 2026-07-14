import { getSingleProject } from "@/app/actions/projects";

import ProjectBoard from "@/components/projects/ProjectBoard";

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

  const project = result?.project;

  if (!project) {
    return <div>Project not found</div>;
  }

  const normalizedProject = {
    ...project,
    columns: project.columns.map((column) => ({
      ...column,
      tasks: column.tasks.map((task) => ({
        ...task,
        priority: task.priority as "Low" | "Medium" | "High" | undefined,
      })),
    })),
  };

  return <ProjectBoard project={normalizedProject} />;
}
