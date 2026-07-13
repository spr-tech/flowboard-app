"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import type { createProjectProps } from "@/types/project";
import type { CreateTaskProps } from "@/types/project";
import { EditTaskProps } from "@/types/project";

//create project
export async function createProject(data: createProjectProps) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to create a project",
    };
  }

  if (!data.name?.trim()) {
    return {
      success: false,
      error: "Project name is required",
    };
  }

  const newProject = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      color: data.color ?? "#7C3AED",
      dueDate: data.dueDate,
      owner: {
        connect: { id: user.id! },
      },
      columns: {
        create: [
          { name: "To Do", order: 1 },
          { name: "In Progress", order: 2 },
          { name: "Done", order: 3 },
        ],
      },
    },
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");
  return { success: true, newProject };
}

//get all project
export async function getProjects() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged in",
      projects: [],
    };
  }

  const projects = await prisma.project.findMany({
    where: {
      OR: [{ ownerId: user.id }, { members: { some: { userId: user.id } } }],
    },

    include: {
      columns: {
        include: {
          tasks: true,
        },
      },

      members: {
        include: {
          user: true,
        },
      },
    },

    orderBy: { updatedAt: "desc" },
  });

  return {
    success: true,
    projects,
  };
}

//get project
export async function getSingleProject(projectId: string) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      success: false,
      error: "You must be logged in to access this feature",
      project: null,
    };
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        {
          ownerId: user.id,
        },
        {
          members: { some: { userId: user.id } },
        },
      ],
    },

    include: {
      columns: {
        include: {
          tasks: {
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },

      members: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
  if (!project) {
    return {
      success: false,
      error: "Project not found",
      project: null,
    };
  }

  return {
    success: true,
    project,
  };
}

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

    include: {
      column: {
        include: {
          project: true,
        },
      },
    },
  });

  revalidatePath(`/projects/${task.column.projectId}`);
  return {
    success: true,
    editedTask,
  };
}
