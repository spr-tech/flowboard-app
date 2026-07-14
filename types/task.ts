import { Priority } from "@/lib/generated/prisma";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: Date | null;
};

export type CreateTaskProps = {
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: Date;
  columnId: string;
};

export type EditTaskProps = {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: Date;
};
