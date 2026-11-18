"use client";

import { ProjectContext } from "./ProjectContext";
import { useState, useContext } from "react";
import { ProjectDetails } from "@/types/project";

export function ProjectProvider({
  initialProject,
  children,
}: {
  initialProject: ProjectDetails | null;
  children: React.ReactNode;
}) {
  const [currentProject, setCurrentProject] = useState<ProjectDetails | null>(
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

  return context;
}
