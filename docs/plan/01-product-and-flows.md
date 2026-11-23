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
- Projects: create, rename, recolour, delete. Roles: OWNER and MEMBER.
- Board: starts with To do, In progress, Done. The owner can add, rename, reorder (the team order) and delete columns, and choose the done column. The owner can let members add columns, up to a shared limit; every member can also reorder columns for their own view only.
- Projects have an optional description (up to 200 characters), shown on the project card and under the board's name.
- Tasks: title, description, priority (LOW, MEDIUM, HIGH), assignee, due date.
- Members: invite by email, remove, leave.
- Dashboard: summary line, stat cards, my tasks grouped by due date, project progress, 14-day completed chart, priority split, next-7-days strip, team activity.
- Account settings: name, password.

## Not in the first version
Google sign-in, a workspace layer above projects, notifications, global search, comments, attachments, real-time updates, viewer role, transferring ownership.

## Flows
1. **First visit:** landing → sign up → `/verify-email` (enter the emailed code, or "Do this later") → empty dashboard → "Create your first project" → name + colour → board with 3 columns → invite prompt (skippable) → first task.
2. **Accept invite:** email link → `/invite/[token]` → no account: sign up with the email pre-filled; has account: sign in → joins as MEMBER → lands on the board.
3. **Daily use:** sign in → dashboard → open a project → drag tasks, or open one to update it.
4. **Create/edit a task:** "+ Add task" at the bottom of a column → type a title, Enter → card appears → click the card → side drawer with details.
5. **Manage a project (owner):** settings → General, Columns, Members, Danger zone.
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
- **Columns.** The owner can always add, rename, reorder, set done and delete columns, whatever the settings say. With "Members can add columns" on, any member can add columns until the project's member-created columns (any creator other than the owner) reach the limit (1 to 10, default 3, for all members together); members can rename only the columns they added. Set as done and delete stay owner-only. Turning the switch off, or lowering the limit, never deletes columns; it only blocks new ones.
- **Column order: team order and personal order.** The team order is the owner's: dragging a column (or move left/right in settings) changes it for everyone. Every member can also drag columns, but for a member that changes only their own view ("Your order", with "Reset to team order"). Columns added later slot in after the column that precedes them in the team order. Card order inside a column, and moving cards between columns, stay shared for everyone. The done column can be moved anywhere and keeps its badge; new columns still go just before it in the team order.
- Task changes are open to every member.
- Forgot password: never reveal whether an email has an account; links expire after 1 hour and work once; requesting a new link cancels older ones; GitHub-only users get an email telling them to sign in with GitHub; at most 3 reset emails per address per hour.
- After a password reset, other devices are signed out using `passwordChangedAt` (see the data model).
- **Email verification.** Email-and-password users confirm their email with a 6-digit code, or the email's backup link. Until then they can use Flowboard normally except inviting people ("Confirm your email before inviting people."), so fake accounts can't use our Gmail to send invites.
  - Who counts as verified: GitHub users (GitHub verifies primary emails), and anyone who accepts an invite sent to their email (the link proves they received it). Password accounts made before this feature start unverified.
  - The code lasts 15 minutes and allows 5 wrong tries; the link lasts 24 hours. Both work once. Sending a new code cancels older ones. At most 3 sends an hour, one a minute.
  - Sign-up sends the code and goes to `/verify-email`, except when signing up from a live invite for the same email (accepting it confirms the email).
  - A banner on every signed-in page ("Confirm your email to invite people.") until verified, dismissible for the browser tab's session.
  - The link page only confirms when its button is clicked, so email scanners that open links can't use it up.
- **New passwords** (sign-up, reset, change) need at least 10 characters and one special character (anything but a letter or a digit, spaces included), and can't contain `<` or `>`. Existing passwords keep working. A strength meter (Weak, Fair, Strong) guides but never blocks.
