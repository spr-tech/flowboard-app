import type { Task } from "@/types/task";
import React from "react";
import { createContext } from "react";

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

type ProjectContextType = {
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
};

export const ProjectContext = createContext<ProjectContextType | null>(null);
