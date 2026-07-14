"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import type { ProjectProps } from "@/types/project";

//create project
export async function createProject(data: ProjectProps) {
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

  if (!data.description?.trim()) {
    return {
      success: false,
      error: "Project description is required",
    };
  }

  const newProject = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
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

//delete project
export async function deleteProject(projectId: string) {
  const user = await getCurrentUser();

  if (!user)
    return {
      success: false,
      error: "You must be logged in to delete a project",
    };

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      ownerId: user.id,
    },
  });

  if (!project) {
    return {
      success: false,
      error: "Project not found",
    };
  }

  const deletedProject = await prisma.project.delete({
    where: { id: project.id },
  });

  revalidatePath("/projects");
  revalidatePath("/dashboard");

  return {
    success: true,
    deletedProject,
  };
}

export function editProject(data: ProjectProps) {}
