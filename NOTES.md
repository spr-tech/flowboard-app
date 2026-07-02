## create project

// ─── FUNCTION ──────────────────────────────────────────────────────────────
// "use server"
// — marks every function in this file as a Server Action
// — guarantees this code only ever runs on the server, never the browser
//
// createProject
// — a Server Action that creates a new project for the logged in user
// — also automatically creates the three default Kanban columns
// (To Do, In Progress, Done) at the same time
//
// const user = await getCurrentUser()
// — checks who is currently logged in using the helper we built earlier
// — if nobody is logged in, user will be null
//
// if (!user) return error
// — block the entire action if there is no logged in user
// — this is the access control check, never trust the frontend alone
//
// if (!data.name?.trim()) return error
// — server side validation, never trust client input
// — trim() removes whitespace, so " " (just spaces) still counts as empty
//
// prisma.project.create({...})
// — inserts a new row into the Project table
// — ownerId: user.id! connects this project to the logged in user
// — the ! tells TypeScript "trust me, user definitely exists here"
// because we already checked for that above
//
// columns: { create: [...] }
// — a nested Prisma write, creates the project AND its three columns
// in a single database operation
// — Prisma automatically links each column to this new project
// because of the relation defined in schema.prisma
//
// revalidatePath("/projects") and revalidatePath("/dashboard")
// — tells Next.js that data behind these routes has changed
// — without this, the projects page and dashboard would keep showing
// stale cached data until a manual hard refresh
//
// return { success: true, project }
// — sends the newly created project back to whoever called this action
// — the frontend uses this to show a success message, redirect,
// or update the UI immediately

## getProject.ts

//"Find every project where the user either owns it, or appears somewhere in its member list. For each of those projects, also fetch all of its columns, and for each column, all of its tasks. Also fetch every member on that project along with their full user details. Sort the final list so the most recently updated project comes first."
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// getProjects
// — fetches every project the logged in user is allowed to see
//
// const user = await getCurrentUser()
// — checks who is logged in using the helper we built earlier
// — if nobody is logged in, user will be null
//
// if (!user) return { success: false, error: ..., projects: [] }
// — this is the access control check, never trust the frontend alone
// — notice we still return projects: [] even though it failed
// — WHY THIS MATTERS:
// whatever code calls getProjects() will likely do something like
// result.projects.map(p => ...) to render a list of project cards
// if projects were undefined instead of an empty array, calling
// .map() on undefined would crash the entire page with a runtime error
// by always guaranteeing projects is at least an empty array,
// the calling code can safely loop through it whether the
// request succeeded or failed, with zero risk of a crash
// this is a defensive coding habit called
// "always returning a consistent shape"
//
// where: { OR: [...] }
// — OR means match either condition, not both
// — ownerId: user.id matches projects this user personally created
// — members: { some: { userId: user.id } } matches projects where
// this user appears in the Member table, meaning they were
// invited to someone else's project as a team member
// — together this fetches every project the user has any access to,
// not just the ones they own
//
// include: { columns: { include: { tasks: true } } }
// — by default Prisma only returns a project's own plain fields
// like name, description, color
// — include tells Prisma "also fetch the related columns for
// this project"
// — nesting include again inside columns says "and for each
// column, also fetch every task that belongs to it"
// — without this nested include, you would get a project with
// no columns or tasks attached at all, forcing you to make
// several separate database calls afterward to piece the
// data together
//
// include: { members: { include: { user: true } } }
// — fetches the list of members attached to each project
// — and for each member, also fetches their actual User record
// (their name, email, avatar) instead of just a raw userId
// number that would be useless on its own in the UI
//
// orderBy: { updatedAt: "desc" }
// — sorts the returned projects by their last updated date
// — "desc" means descending order, newest changes appear first
// — this is why your "Recent Projects" section on the dashboard
// will naturally show the most recently active projects at
// the top without any extra sorting logic needed on the frontend
//
// return { success: true, projects }
// — sends back the full list of projects, each one already
// containing its columns, tasks, and members nested inside
// — the frontend can directly render project cards and the
// kanban board from this single response, with zero additional
// database calls required
