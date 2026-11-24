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
- Accounts: email + password, GitHub. Forgot password. Email verification with a 6-digit code (or the email's link).
- Projects: create, rename, recolour, delete. Roles: OWNER, MANAGER (at most 3 per project) and MEMBER; see "Permissions" below.
- Board: starts with To do, In progress, Done. The owner, and managers allowed to, add, rename, reorder (the team order) and delete columns; only the owner chooses the done column. Everyone else reorders columns and cards for their own view only.
- Projects have an optional description (up to 200 characters), shown on the project card and under the board's name.
- Tasks: title, description, priority (LOW, MEDIUM, HIGH), assignee, due date, and short notes from anyone on the project.
- Members: invite by email, remove, leave.
- Dashboard: summary line, stat cards, my tasks grouped by due date, project progress, 14-day completed chart, priority split, next-7-days strip, team activity.
- Account settings: name, password.

## Not in the first version
Google sign-in, a workspace layer above projects, notifications, global search, comments, attachments, real-time updates, viewer role, transferring ownership.

## Flows
1. **First visit:** landing → sign up → `/verify-email` (enter the emailed code, or "Do this later") → empty dashboard → "Create your first project" → name + colour → board with 3 columns → invite prompt (skippable) → first task.
2. **Accept invite:** email link → `/invite/[token]` → no account: sign up with the email pre-filled; has account: sign in → joins as MEMBER → lands on the board.
3. **Daily use:** sign in → dashboard → open a project → drag tasks, or open one to update it.
4. **Create/edit a task:** "+ Add task" at the bottom of a column → type a title, Enter → card appears (members first fill in a short form: title, a description of at least 20 characters, an optional due date) → click the card → side drawer with details and notes.
5. **Manage a project (owner):** settings → General, Columns, Tasks (the take limit), Members (roles, managers' permissions, invites), Danger zone.
6. **Leave a project (member):** settings → Leave.
7. **Account:** change name or password, sign out.
8. **Forgot password:** sign in → "Forgot password?" → email → the same message whether or not the account exists → link → new password → sign in.
9. **Confirm your email:** after sign-up, or from the banner's "Enter code" → `/verify-email` → type or paste the 6-digit code (it submits on the sixth digit) → "Email confirmed" → back where they came from. Or the email's "Confirm my email" button → `/verify-email/link/[token]` → click "Confirm my email" → confirmed.

## Decisions
- Invites are records with a token that expires after 7 days. Resending creates a new token.
- Task details open in a side drawer; the URL becomes `?task=<taskId>`.
- Deleting a column with tasks: the dialog shows the task count and offers (a) move the tasks to another column (default), or (b) type the column name to delete the column and its tasks. The last column can never be deleted.
- Removing a member unassigns their tasks in that project.
- The owner cannot leave; they can only delete the project, by typing its name.
- **Columns.** Team columns are for the owner and for managers: managers with manageColumns add, rename and reorder them; managers with deleteColumns delete them, but never the done column (deleting it picks a new done column, and choosing the done column is the owner's alone). Members can't add, rename, reorder or delete team columns (403); columns members added before this change stay as normal team columns. (The old "Members can add columns" setting is gone; personal columns for members are a later branch.)
- **Team order and personal order, for columns and for cards.** The team order is changed by the owner, by managers with manageColumns (columns) and by managers with "Change team task order in columns" (cards). Everyone else can still drag any column, and any card within a column, but that changes only their own view ("Your order", with "Reset to team order", which resets both columns and cards). Columns and cards added later slot in at their team position (right after the one before them in the team order). The done column can be moved anywhere and keeps its badge; new columns still go just before it in the team order.
- **Moving cards between columns** is shared: everyone sees it. Members (and managers without moveAnyTask) move only tasks assigned to them; a card they can't move snaps back with "You can only move tasks assigned to you." and shows a small lock. When someone with a personal card order moves their task to another column, it lands at the TOP of that column's team order (so whoever watches the column sees it first) and where they dropped it in their own order. The owner's and managers' moves land exactly where they drop the card. New tasks still go to the bottom.
- Task changes follow the permissions below (there is no project-wide "members can manage all tasks" switch: managers replace it).
- Forgot password: never reveal whether an email has an account; links expire after 1 hour and work once; requesting a new link cancels older ones; GitHub-only users get an email telling them to sign in with GitHub; at most 3 reset emails per address per hour.
- After a password reset, other devices are signed out using `passwordChangedAt` (see the data model).
- **Email verification.** Email-and-password users confirm their email with a 6-digit code, or the email's backup link. Until then they can use Flowboard normally except inviting people ("Confirm your email before inviting people."), so fake accounts can't use our Gmail to send invites.
  - Who counts as verified: GitHub users (GitHub verifies primary emails), and anyone who accepts an invite sent to their email (the link proves they received it). Password accounts made before this feature start unverified.
  - The code lasts 15 minutes and allows 5 wrong tries; the link lasts 24 hours. Both work once. Sending a new code cancels older ones. At most 3 sends an hour, one a minute.
  - Sign-up sends the code and goes to `/verify-email`, except when signing up from a live invite for the same email (accepting it confirms the email).
  - A banner on every signed-in page ("Confirm your email to invite people.") until verified, dismissible for the browser tab's session.
  - The link page only confirms when its button is clicked, so email scanners that open links can't use it up.
- **New passwords** (sign-up, reset, change) need at least 10 characters and one special character (anything but a letter or a digit, spaces included), and can't contain `<` or `>`. Existing passwords keep working. A strength meter (Weak, Fair, Strong) guides but never blocks.

## Permissions
Three roles per project. One pure helper, `can(action, context)` in `src/utilities/helpers/permissions.ts`, decides every action below for both the server (403 with its reason) and the browser (what shows, what's locked), so they never disagree.

- **Owner**: everything. Always owner-only, whatever a manager's switches say: project settings (name, colour, description, the take limit), promoting and demoting, managers' permissions, choosing the done column, deleting the project.
- **Manager** (at most 3; 409 `MANAGER_LIMIT`): per-person switches set by the owner. Defaults when promoted: createAndAssign, editAnyTask, moveAnyTask, teamOrder ("Change team task order in columns"), manageColumns (add, rename, reorder) and inviteMembers on; deleteAnyTask, deleteColumns and removeMembers off. A switch that's off means the member rule for that action. Demoting clears the switches.
- **Member**: the member rules in the table.

| Action | Owner | Manager | Member |
|---|---|---|---|
| Project settings, take limit, roles, managers' permissions, done column, delete project | Yes | No (read-only) | No (read-only) |
| Add, rename, reorder team columns | Yes | With manageColumns | No (own column order) |
| Delete columns | Yes | With deleteColumns, never the done column | No |
| Invite people (send, resend, cancel) | Yes | With inviteMembers | No |
| Remove people | Anyone but themselves | With removeMembers: members only | No |
| Create a task | Instant, any assignee | With createAndAssign: like the owner; else the member rule | Assigned to themselves, a description of 20+ characters, due date set at creation only |
| Assign someone else, or unassign | Yes | With createAndAssign | No |
| "Assign to me" on an unassigned task | Yes | Yes | Up to the take limit (default 5, 1 to 20) |
| Edit title, description, priority | Any task | With editAnyTask; else tasks they created | Tasks they created |
| Change the due date | Any task | With editAnyTask | Never after creation |
| Move between columns (into done too) | Any task | With moveAnyTask; else tasks assigned to them | Tasks assigned to them |
| Card order within a column | Team order | With teamOrder: team order; else their own | Their own view only |
| Delete a task (with Undo) | Any task | With deleteAnyTask; else tasks they created | Tasks they created |
| Add a note | Yes | Yes | Yes |
| Delete a note | Any note | Their own | Their own |

- **Take limit.** Only open tasks a member took from the pool count: not tasks they created, not tasks the owner or a manager assigned to them, not tasks in the done column. At the limit, "Assign to me" is disabled with "You've taken N open tasks. Finish one first, or ask the owner to assign more." (409 `TAKE_LIMIT_REACHED`). Members see "You've taken N of M open tasks." on the board.
- **Assign to me** shows only on unassigned tasks outside the done column; taking a done task is refused (409 `TASK_DONE`).
- **Locked tasks.** A task assigned to a member, or taken from the pool, is locked for them except moving and notes.
- **"New" badge.** Tasks created by members show a lime "New" badge to the owner until the owner opens the task.
- **Notes.** Anyone who can see the task adds a note (1 to 1000 characters). Authors delete their own; the owner deletes any. Notes are never edited.
