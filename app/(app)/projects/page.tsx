import { getProjects } from "@/app/actions/projects";
import ProjectView from "@/components/projects/ProjectView";

export default async function ProjectPage() {
  const results = await getProjects();
  const projects = results?.projects ?? [];

  return <ProjectView projects={projects} />;
}
