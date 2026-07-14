"use client";

import Link from "next/link";
import { Delete } from "lucide-react";
import { useState } from "react";
import DeleteModal from "../modals/DeleteModal";

type Project = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  status: string;
};

type ProjectSettingsProps = {
  project: Project;
};

export default function ProjectSettings({ project }: ProjectSettingsProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  return (
    <>
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

        <div className="hover:text-red-200 text-red-500">
          <Delete onClick={() => setSelectedProjectId(project.id)} />
        </div>
      </div>

      {selectedProjectId && (
        <DeleteModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
        />
      )}
    </>
  );
}
