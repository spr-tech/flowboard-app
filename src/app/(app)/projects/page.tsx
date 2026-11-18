import { getProjects } from "@/app/actions/projects";
import ProjectsView from "@/components/projects/ProjectsView";

export default async function ProjectPage() {
  const results = await getProjects();
  const projects = results?.projects ?? [];

  return <ProjectsView projects={projects} />;
}
