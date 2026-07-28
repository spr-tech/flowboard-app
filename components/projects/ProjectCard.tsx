"use client";
// represent each project 
import Link from "next/link";
import { Edit, Delete, Settings2 } from "lucide-react";
import { useState } from "react";
import ProjectModal from "../modals/ProjectModal";
import DeleteModal from "../modals/DeleteModal";
import { Project } from "@/types/project";

type ProjectSettingsProps = {
  project: Project;
};

export default function ProjectCard({ project }: ProjectSettingsProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        key={project.id}
        className="flex flex-1 justify-between hover:cursor-pointer bg-white border border-[#E5E7EB] rounded-xl p-4 transition-all hover:shadow-md hover:-translate-y-1"
      >
        <Link href={`/projects/${project.id}`}>
          <div className="">
            <span
              className="flex items-center justify-center w-10 h-10 mb-3 font-medium text-white rounded-lg"
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

        {/* Edit Icon Wrapper Button */}
        <div className="flex items-start ">
          <button
            onClick={() => setSelectedProject(project)}
            type="button"
            className="p-1 transition-colors rounded-md cursor-pointer text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            aria-label="Edit project"
          >
            {/* <Edit size={20} /> */}
          </button>

          <button
            type="button"
            onClick={() => setSelectedProjectId(project.id)}
            className="p-1 text-red-500 transition-colors rounded-md cursor-pointer hover:text-red-600 hover:bg-red-50"
            aria-label="Delete project"
          >
            {/* <Delete size={20} /> */}
          </button>
          
          <button
            type="button"
            onClick={() => setSelectedProjectId(project.id)}
            className="p-1 text-red-500 transition-colors rounded-md cursor-pointer hover:text-red-600 hover:bg-red-50"
            aria-label="Delete project"
          >
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {(selectedProject || modalOpen) && (
        <ProjectModal
          project={selectedProject}
          onClose={() => {
            setSelectedProject(null);
            setModalOpen(false);
          }}
        />
      )}

      {selectedProjectId && (
        <DeleteModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </>
  );
}
