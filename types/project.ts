import type { Task } from "./task";
import type { Member } from "./member";
import type { User } from "./user";

export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate: Date | null;
};

export type CreateProjectProps = {
  name: string;
  description: string;
  color: string;
  dueDate?: Date | null;
};

export type EditProjectProps = {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate?: Date | null;
};

export type Column = {
  id: string;
  name: string;
  order: number;
  tasks: Task[];
};

export type ProjectDetails = Project & {
  status: string;
  ownerId: string;
  owner?: User;
  members: Member[];
  columns: Column[];
};
