import { getProjects } from "@/app/actions/projects";
import ProjectSettings from "@/components/projects/ProjectSettings";

export default async function ProjectPage() {
  const results = await getProjects();
  const projects = results?.projects ?? [];

  return (
    <>
      <div className="mb-6">
        <p className="text-gray-800 font-semibold ">My projects</p>
        <span className="text-[12px] text-gray-700">
          All project you own or are a member of.
        </span>
      </div>
      {/* project cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectSettings key={project?.id} project={project} />
        ))}
      </div>
    </>
  );
}
