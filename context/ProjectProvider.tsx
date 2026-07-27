import { ProjectContext } from "./ProjectContext";
import { useState, useContext } from "react";
import type { Task } from "@/types/task";

type Project = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  status: string;
  columns: Column[];
};

type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

export function ProjectProvider({
  initialProject,
  children,
}: {
  initialProject: Project | null;
  children: React.ReactNode;
}) {
  const [currentProject, setCurrentProject] = useState<Project | null>(
    initialProject
  );

  return (
    <ProjectContext.Provider value={{ currentProject, setCurrentProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used inside ProjectProvider");
  }
}
