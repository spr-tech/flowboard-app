# 1. Product and user flows

## What it is
A Kanban workspace where a small team (about 2–10 people) plans a project and moves tasks from idea to done. Not for enterprises: no complex permissions, billing or departments.

## The five jobs every feature serves
1. Start a project and get a board immediately.
2. Bring teammates in.
3. Capture work as tasks and say who owns each one.
4. See what's moving, what's stuck and what's late.
5. Move work forward by dragging cards.

## In the first version
- Accounts: email + password, GitHub. Forgot password.
- Projects: create, rename, recolour, delete. Roles: OWNER and MEMBER.
- Board: starts with To do, In progress, Done. The owner can add, rename, reorder and delete columns, and choose the done column.
- Tasks: title, description, priority (LOW, MEDIUM, HIGH), assignee, due date.
- Members: invite by email, remove, leave.
- Dashboard: summary line, stat cards, my tasks grouped by due date, project progress, 14-day completed chart, priority split, next-7-days strip, team activity.
- Account settings: name, password.

## Not in the first version
Google sign-in, a workspace layer above projects, notifications, global search, comments, attachments, real-time updates, viewer role, transferring ownership.

## Flows
1. **First visit:** landing → sign up → empty dashboard → "Create your first project" → name + colour → board with 3 columns → invite prompt (skippable) → first task.
2. **Accept invite:** email link → `/invite/[token]` → no account: sign up with the email pre-filled; has account: sign in → joins as MEMBER → lands on the board.
3. **Daily use:** sign in → dashboard → open a project → drag tasks, or open one to update it.
4. **Create/edit a task:** "+ Add task" at the bottom of a column → type a title, Enter → card appears → click the card → side drawer with details.
5. **Manage a project (owner):** settings → General, Columns, Members, Danger zone.
6. **Leave a project (member):** settings → Leave.
7. **Account:** change name or password, sign out.
8. **Forgot password:** sign in → "Forgot password?" → email → the same message whether or not the account exists → link → new password → sign in.

## Decisions
- Invites are records with a token that expires after 7 days. Resending creates a new token.
- Task details open in a side drawer; the URL becomes `?task=<taskId>`.
- Deleting a column with tasks: the dialog shows the task count and offers (a) move the tasks to another column (default), or (b) type the column name to delete the column and its tasks. The last column can never be deleted.
- Removing a member unassigns their tasks in that project.
- The owner cannot leave; they can only delete the project, by typing its name.
- Column changes are owner-only; task changes are open to every member.
- Forgot password: never reveal whether an email has an account; links expire after 1 hour and work once; requesting a new link cancels older ones; GitHub-only users get an email telling them to sign in with GitHub; at most 3 reset emails per address per hour.
- After a password reset, other devices are signed out using `passwordChangedAt` (see the data model).
