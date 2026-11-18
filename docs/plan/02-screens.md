# 2. Screens

Every screen has designed loading (skeleton), empty and error (with retry) states, and works on a phone.

## Public
1. Landing `/` (designed)
2. Sign in `/login` (designed)
3. Sign up `/register` (designed)
4. Forgot password `/forgot-password`: email field, then "check your inbox"
5. Reset password `/reset-password/[token]`: new + confirm with live checks; expired and used states
6. Accept invite `/invite/[token]`: valid, expired, already used, signed in as a different email

## App (sidebar: Dashboard, Projects, Settings · top bar: Create button, user menu)
7. Dashboard `/dashboard`
   - Summary line ("You have 2 overdue tasks and 5 due this week")
   - Stat cards: assigned to me, due this week, overdue, completed this week (each filters the list)
   - My tasks grouped: Overdue, Today, This week, Later, No due date; a checkbox moves a task to its done column
   - Project progress rows: progress bar, avatars, next deadline
   - Completed per day, last 14 days (bar chart)
   - My open work by priority (split bar)
   - Next 7 days strip with a dot per task
   - Team activity feed
   - New user: one empty state, "Create your first project"
8. Projects `/projects`: grid of project cards (colour, progress, avatars); "New project" modal
9. Board `/projects/[projectId]`: header (name, avatars, Invite, settings), columns, "+ Add task", "Add column" (owner)
10. Task drawer: `?task=<taskId>` on the board URL; title, description, priority, assignee, due date, column, delete
11. Project settings `/projects/[projectId]/settings`: General · Columns · Members (list, invite, remove, pending invites with resend and cancel) · Danger zone
12. Account settings `/settings`: name, change password (email users), sign out
13. Not found and error pages

Removed from the current app: the "Team" and "Workspace" sidebar items, search, the notifications bell, Google sign-in buttons.
