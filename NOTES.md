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


## getSingleProject 
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// getSingleProject
// — fetches one specific project that the logged in user
// is allowed to access
//
// const user = await getCurrentUser()
// — identifies the currently logged in user
//
// if (!user) return error
// — prevents guests from accessing project information
// — authentication is always checked on the server
//
// prisma.project.findFirst({...})
// — searches for exactly one project
// — unlike findUnique(), findFirst() lets us combine the project id
// with authorization rules inside the same query
//
// where: {
//   id: projectId,
//   OR: [...]
// }
// — first checks that the project id matches
// — then verifies the logged in user either:
//    • owns the project
//    • or is listed as one of its members
// — this prevents users from accessing projects simply by
// changing the URL
//
// include: {
//   columns: {
//     include: {
//       tasks: ...
//     }
//   }
// }
// — fetches every column belonging to the project
// — then fetches every task belonging to each column
//
// tasks: {
//   orderBy: {
//      createdAt: "desc"
//   }
// }
// — newest tasks appear first inside each column
// — later this could be replaced with a custom position field
// for drag-and-drop ordering
//
// include: {
//   members: {
//      include: {
//          user: true
//      }
//   }
// }
// — loads every project member together with their user details
//
// if (!project)
// — if nothing matched, either:
//    • the project doesn't exist
//    • or the user isn't allowed to access it
// — returning a generic error avoids exposing unnecessary information
//
// return { success: true, project }
// — sends back the complete project including:
//    • columns
//    • tasks
//    • members
// ready for the project page


## createTask
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// createTask
// — creates a new task inside an existing project column
//
// const user = await getCurrentUser()
// — identifies the logged in user
//
// if (!user)
// — blocks guests from creating tasks
//
// if (!data.title.trim())
// — validates the task title
// — trim() removes whitespace so blank titles cannot be created
//
// prisma.column.findFirst({...})
// — this is the authorization check
// — instead of trusting the frontend's columnId,
// we verify the column actually exists
//
// where: {
//    id: data.columnId,
//    project: ...
// }
//
// — Prisma follows the relationship:
//
// Task
//   ↓
// Column
//   ↓
// Project
//
// — since a task belongs to a column,
// and the column belongs to a project,
// checking the project automatically verifies
// the user has permission to create tasks there
//
// project: {
//    OR: [...]
// }
//
// — the logged in user must either
//    • own the project
//    • or be one of its members
//
// — this prevents someone from sending a fake columnId
// belonging to another user's project
//
// if (!column)
// — if nothing matched,
// either the column doesn't exist,
// or the user isn't allowed to use it
//
// prisma.task.create({...})
// — inserts the new task
//
// column: {
//    connect: {
//       id: column.id
//    }
// }
//
// — links the new task to the verified column
// — we use column.id returned from the server,
// not the original client input
//
// revalidatePath(`/projects/${column.projectId}`)
// — refreshes only the affected project page
// — avoids refreshing unrelated pages
//
// return { success: true, newTask }
// — returns the newly created task

## deleteTask 
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// deleteTask
// — removes an existing task
//
// const user = await getCurrentUser()
// — verifies the user is logged in
//
// prisma.task.findFirst({...})
// — looks for the requested task
//
// where: {
//    id: taskId,
//    column: {
//       project: ...
//    }
// }
//
// — Prisma walks through the relationships:
//
// Task
//   ↓
// Column
//   ↓
// Project
//
// — the task must belong to a project
// that the logged in user owns
// or is a member of
//
// — this prevents users from deleting tasks
// that belong to someone else's project
//
// include: {
//    column: {
//       include: {
//          project: true
//       }
//    }
// }
//
// — loads the task's column and project
// so we know which project page to refresh afterward
//
// if (!task)
// — either:
//    • the task doesn't exist
//    • or the user isn't authorized
// — returning a generic "Task not found"
// reveals no information to attackers
//
// prisma.task.delete({...})
// — removes the verified task
//
// where: {
//    id: task.id
// }
//
// — uses the id retrieved from the verified server query,
// rather than trusting client input again
//
// revalidatePath(`/projects/${task.column.projectId}`)
// — refreshes the project page
//
// return { success: true, removedTask }
// — returns the deleted task

## editTask
// ─── FUNCTION ──────────────────────────────────────────────────────────────
// editTask
// — updates an existing task
//
// const user = await getCurrentUser()
// — verifies the user is logged in
//
// if (!data.title.trim())
// — validates the new task title
// — prevents blank task names
//
// prisma.task.findFirst({...})
// — verifies both:
//    • the task exists
//    • the logged in user is allowed to edit it
//
// where: {
//    id: data.id,
//    column: {
//       project: ...
//    }
// }
//
// — Prisma again follows:
//
// Task
//   ↓
// Column
//   ↓
// Project
//
// — if the project belongs to the user,
// or the user is one of its members,
// editing is allowed
//
// include: {
//    column: {
//       include: {
//          project: true
//       }
//    }
// }
//
// — loads the project so its page can
// be revalidated after the update
//
// if (!task)
// — if nothing matched,
// the task either doesn't exist
// or the user isn't authorized
//
// prisma.task.update({...})
// — updates the verified task
//
// where: {
//    id: task.id
// }
//
// — again uses the verified task id
// returned by the server query
//
// data: {
//    title,
//    description,
//    priority,
//    dueDate
// }
//
// — only these fields are updated
//
// revalidatePath(`/projects/${task.column.projectId}`)
// — refreshes the affected project page
//
// return { success: true, editedTask }
// — returns the updated task