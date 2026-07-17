"use client";

import Link from "next/link";
import { Edit, Delete } from "lucide-react";
import { useState } from "react";
import ProjectModal from "../modals/ProjectModal";
import DeleteModal from "../modals/DeleteModal";
import { Project } from "@/types/project";

type ProjectSettingsProps = {
  project: Project;
};

export default function ProjectSettings({ project }: ProjectSettingsProps) {
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

        {/* Edit Icon Wrapper Button */}
        <div className="flex items-start ">
          <button
            type="button"
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Edit project"
          >
            <Edit size={20} onClick={() => setSelectedProject(project)} />
          </button>

          <button
            type="button"
            onClick={() => setSelectedProjectId(project.id)}
            className="p-1 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            aria-label="Delete project"
          >
            <Delete size={20} />
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
