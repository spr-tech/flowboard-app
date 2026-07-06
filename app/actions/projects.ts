"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";
import { success } from "zod";

type createProjectProps = {
  name: string;
  description?: string;
  color?: string;
  dueDate?: Date;
};

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
