export type CreateTaskProps = {
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  dueDate?: Date;
  columnId: string;
};

export type EditTaskProps = {
  id: string;
  title: string;
  description?: string;
  priority?: "Low" | "Medium" | "High";
  dueDate?: Date;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: "Low" | "Medium" | "High";
  dueDate: Date | null;
};
