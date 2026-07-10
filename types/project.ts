export type createProjectProps = {
  name: string;
  description?: string;
  color?: string;
  dueDate?: Date;
};

export type CreateTaskProps = {
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  dueDate?: Date;
  columnId: string;
};
