"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

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

//"Find every project where the user either owns it, or appears somewhere in its member list. For each of those projects, also fetch all of its columns, and for each column, all of its tasks. Also fetch every member on that project along with their full user details. Sort the final list so the most recently updated project comes first."
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// getProjects
//    — fetches every project the logged in user is allowed to see
//
// const user = await getCurrentUser()
//    — checks who is logged in using the helper we built earlier
//    — if nobody is logged in, user will be null
//
// if (!user) return { success: false, error: ..., projects: [] }
//    — this is the access control check, never trust the frontend alone
//    — notice we still return projects: [] even though it failed
//    — WHY THIS MATTERS:
//      whatever code calls getProjects() will likely do something like
//      result.projects.map(p => ...) to render a list of project cards
//      if projects were undefined instead of an empty array, calling
//      .map() on undefined would crash the entire page with a runtime error
//      by always guaranteeing projects is at least an empty array,
//      the calling code can safely loop through it whether the
//      request succeeded or failed, with zero risk of a crash
//      this is a defensive coding habit called
//      "always returning a consistent shape"
//
// where: { OR: [...] }
//    — OR means match either condition, not both
//    — ownerId: user.id matches projects this user personally created
//    — members: { some: { userId: user.id } } matches projects where
//      this user appears in the Member table, meaning they were
//      invited to someone else's project as a team member
//    — together this fetches every project the user has any access to,
//      not just the ones they own
//
// include: { columns: { include: { tasks: true } } }
//    — by default Prisma only returns a project's own plain fields
//      like name, description, color
//    — include tells Prisma "also fetch the related columns for
//      this project"
//    — nesting include again inside columns says "and for each
//      column, also fetch every task that belongs to it"
//    — without this nested include, you would get a project with
//      no columns or tasks attached at all, forcing you to make
//      several separate database calls afterward to piece the
//      data together
//
// include: { members: { include: { user: true } } }
//    — fetches the list of members attached to each project
//    — and for each member, also fetches their actual User record
//      (their name, email, avatar) instead of just a raw userId
//      number that would be useless on its own in the UI
//
// orderBy: { updatedAt: "desc" }
//    — sorts the returned projects by their last updated date
//    — "desc" means descending order, newest changes appear first
//    — this is why your "Recent Projects" section on the dashboard
//      will naturally show the most recently active projects at
//      the top without any extra sorting logic needed on the frontend
//
// return { success: true, projects }
//    — sends back the full list of projects, each one already
//      containing its columns, tasks, and members nested inside
//    — the frontend can directly render project cards and the
//      kanban board from this single response, with zero additional
//      database calls required
