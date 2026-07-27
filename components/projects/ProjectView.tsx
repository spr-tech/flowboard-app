"use client";
import ProjectCard from "@/components/projects/ProjectCard";
import type { Project } from "@/types/project";
import ProjectModal from "../modals/ProjectModal";
import { useState } from "react";

export default function ProjectView({ projects }: { projects: Project[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="mb-6">
        <p className="font-semibold text-gray-800 ">My projects</p>
        <span className="text-[12px] text-gray-700">
          All project you own or are a member of.
        </span>
      </div>
      {/* project cards */}
      {projects.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project?.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-end gap-2 min-h-50">
          <p className="text-gray-700">No project available</p>
          <button
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-4 h-10 rounded-xl shadow-sm shadow-purple-600/10 hover:shadow-purple-700/20 active:scale-[0.98] transition-all shrink-0"
            onClick={() => setModalOpen(true)}
          >
            Create Project
          </button>

          {modalOpen && <ProjectModal onClose={() => setModalOpen(false)} />}
        </div>
      )}
    </>
  );
}
