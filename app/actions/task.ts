"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import type { CreateTaskProps } from "@/types/project";
import { EditTaskProps } from "@/types/project";

//create task
export async function createTask(data: CreateTaskProps) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to create task",
    };
  }

  if (!data.title.trim()) {
    return {
      success: false,
      error: "Task name is required",
    };
  }

  const column = await prisma.column.findFirst({
    where: {
      id: data.columnId,

      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
  });
  if (!column) {
    return {
      success: false,
      error: "Column not found",
    };
  }

  const newTask = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description ?? "No description",
      priority: data.priority,
      dueDate: data.dueDate,
      column: {
        connect: {
          id: column.id,
        },
      },
    },
  });

  revalidatePath(`/projects/${column.projectId}`);
  return {
    success: true,
    newTask,
  };
}

//delete task
export async function deleteTask(taskId: string) {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged to delete task",
    };
  }

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,

      column: {
        project: {
          OR: [
            { ownerId: user.id },
            { members: { some: { userId: user.id } } },
          ],
        },
      },
    },

    include: {
      column: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!task) {
    return {
      success: false,
      error: "Task not found",
    };
  }

  const removedTask = await prisma.task.delete({
    where: { id: task.id },
  });

  revalidatePath(`/projects/${task.column.projectId}`);
  return {
    success: true,
    removedTask,
  };
}

//edit task
export async function editTask(data: EditTaskProps) {
  const user = await getCurrentUser();
  if (!user)
    return {
      success: false,
      error: "You must be logged in to edit task",
    };

  if (!data.title.trim()) {
    return {
      success: false,
      error: "Task name required",
    };
  }

  // Edit task
  const task = await prisma.task.findFirst({
    where: {
      id: data.id,

      column: {
        project: {
          OR: [
            {
              ownerId: user.id,
            },
            {
              members: { some: { userId: user.id } },
            },
          ],
        },
      },
    },

    include: {
      column: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!task)
    return {
      success: false,
      error: "Task not found",
    };

  const editedTask = await prisma.task.update({
    where: {
      id: task.id,
    },
    data: {
      title: data.title.trim(),
      description: data.description,
      priority: data.priority,
      dueDate: data.dueDate,
    },
  });

  revalidatePath(`/projects/${task.column.projectId}`);
  return {
    success: true,
    editedTask,
  };
}

//moving a task
export async function moveTask(taskId: string, destinationColumnId: string) {
  const user = await getCurrentUser();
  if (!user)
    return {
      success: false,
      error: "You must be logged in to move task",
    };

  const task = await prisma.task.findFirst({
    where: {
      id: taskId,

      column: {
        project: {
          OR: [
            { ownerId: user.id },
            {
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          ],
        },
      },
    },
    include: {
      column: {
        include: {
          project: true,
        },
      },
    },
  });

  if (!task) {
    return {
      success: false,
      error: "Task not found",
    };
  }

  const destinationColumn = await prisma.column.findFirst({
    where: {
      id: destinationColumnId,
      project: {
        OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
      },
    },
  });

  if (!destinationColumn) {
    return {
      success: false,
      error: "Column not found",
    };
  }

  const movedTask = await prisma.task.update({
    where: { id: task.id },
    data: {
      columnId: destinationColumn.id,
    },
  });

  revalidatePath(`/projects/${task.column.projectId}`);
  return {
    success: true,
    movedTask,
  };
}
