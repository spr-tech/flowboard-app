import { getProjects } from "@/app/actions/projects";
import Link from "next/link";
import { Delete } from "lucide-react";
import { deleteProject } from "@/app/actions/projects";

export default async function ProjectPage() {
  const results = await getProjects();
  const projects = results?.projects ?? [];

const handleDeleteProject = async () => {
  
}

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
          <div
            key={project.id}
            className="flex justify-between hover:cursor-pointer bg-white border border-[#E5E7EB] rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-1"
          >
            <Link href={`/projects/${project.id}`}>
              <div className="">
                <span
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium mb-3"
                  style={{ backgroundColor: project.color }}
                >
                  {project.name[0].toUpperCase()}
                </span>
                <p className="text-[#111827] font-medium">{project.name}</p>
                <p className="text-[#6B7280] text-sm mt-1">
                  {project.description || "No description"}
                </p>
              </div>
            </Link>

            <div className="hover:text-slate-800 text-red-500">
              <Delete onClick={} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
