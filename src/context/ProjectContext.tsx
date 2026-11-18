import { createContext } from "react";
import { ProjectDetails } from "@/types/project";

type ProjectContextType = {
  currentProject: ProjectDetails | null;
  setCurrentProject: React.Dispatch<
    React.SetStateAction<ProjectDetails | null>
  >;
};

export const ProjectContext = createContext<ProjectContextType | null>(null);
