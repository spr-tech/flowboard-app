import { Priority } from "@/lib/generated/prisma";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: Date | null;
  columnId: string;
};

export type CreateTaskProps = Omit<Task, "id"> & {
  description?: string | null;
  dueDate?: Date | null;
};

export type EditTaskProps = Omit<Task, "columnId"> & {
  description?: string | null;
  dueDate?: Date | null;
};
