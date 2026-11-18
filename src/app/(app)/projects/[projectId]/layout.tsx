import { getSingleProject } from "@/app/actions/projects";
import { ProjectProvider } from "@/context/ProjectProvider";

type Props = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectLayout({ children, params }: Props) {
  const { projectId } = await params;

  const result = await getSingleProject(projectId);

  if (!result.success || !result.project) {
    return <div>{result.error ?? "Project not found"}</div>;
  }

  return (
    <ProjectProvider initialProject={result.project}>
      {children}
    </ProjectProvider>
  );
}
