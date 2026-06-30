"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { revalidatePath } from "next/cache";

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
      ownerId: user.id!,
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

// ─── FUNCTION ──────────────────────────────────────────────────────────────
// "use server"
//    — marks every function in this file as a Server Action
//    — guarantees this code only ever runs on the server, never the browser
//
// createProject
//    — a Server Action that creates a new project for the logged in user
//    — also automatically creates the three default Kanban columns
//      (To Do, In Progress, Done) at the same time
//
// const user = await getCurrentUser()
//    — checks who is currently logged in using the helper we built earlier
//    — if nobody is logged in, user will be null
//
// if (!user) return error
//    — block the entire action if there is no logged in user
//    — this is the access control check, never trust the frontend alone
//
// if (!data.name?.trim()) return error
//    — server side validation, never trust client input
//    — trim() removes whitespace, so " " (just spaces) still counts as empty
//
// prisma.project.create({...})
//    — inserts a new row into the Project table
//    — ownerId: user.id! connects this project to the logged in user
//    — the ! tells TypeScript "trust me, user definitely exists here"
//      because we already checked for that above
//
// columns: { create: [...] }
//    — a nested Prisma write, creates the project AND its three columns
//      in a single database operation
//    — Prisma automatically links each column to this new project
//      because of the relation defined in schema.prisma
//
// revalidatePath("/projects") and revalidatePath("/dashboard")
//    — tells Next.js that data behind these routes has changed
//    — without this, the projects page and dashboard would keep showing
//      stale cached data until a manual hard refresh
//
// return { success: true, project }
//    — sends the newly created project back to whoever called this action
//    — the frontend uses this to show a success message, redirect,
//      or update the UI immediately
