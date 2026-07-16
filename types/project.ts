export type Project = {
  id: string;
  name: string;
  description: string;
  color: string;
  dueDate: Date | null;
};

export type CreateProjectProps = Omit<Project, "id"> & {
  dueDate?: Date | null;
};

export type EditProjectProps = Project & {
  dueDate?: Date | null;
};
