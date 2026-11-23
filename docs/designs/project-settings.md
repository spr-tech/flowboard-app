# Project settings: design notes (milestone 5, with Members finished in milestone 7)

Reference: `projectSettings.dc.html` (layout, spacing and copy only; it runs in the design tool, don't import it). `board.dc.html` is updated so its settings button links here.

Route: `/projects/[projectId]/settings`. Breadcrumb: Projects / <project name> / Settings, plus a "Back to board" button.

Layout: same two-column sections as account settings (title + description left, card right), stacked on screens under 960px.

## Owner vs member
- Owners can change everything.
- Members see the same page read-only, with a note at the top: "Only the owner can change the name, colour, columns and members." Fields and swatches are disabled; column controls and the invite form are hidden; the Danger zone shows Leave instead of Delete.
- The page title line says "you're the owner" or "you're a member".

## General
- Project name (required, max 60), an optional description (max 200, "N / 200"; read-only for members) and the 8 colour keys as a radio group.
- Save is enabled only when the name, colour or description changed; Cancel restores the saved values. Toast: "Project updated".

## Columns (owner only to change, except members adding columns when allowed)
- Owner: a switch "Members can add columns"; when it's on, a number input "Up to [3] columns" (1 to 10) with "N of M used" next to it. Saves on change, with a toast. Members see it as text: "Members can add up to 3 columns · 1 used", or "Only the owner can add columns".
- Every column row shows "Added by <name> · <date>".
- Move left / move right change the team order (PATCH /api/columns/:columnId/move).
- Ordered list, left to right, each row: position number, inline-editable name (max 40), task count, "Done column" badge or "Set as done" button, move left / move right buttons (keyboard-accessible alternative to dragging), delete.
- Delete is disabled on the last remaining column.
- Delete dialog from settings: empty column → simple confirm. With tasks → move them to another column, then delete. (Deleting the tasks too is only offered from the board's column menu, with the typed confirmation.)
- Add column: input + "Add column"; new columns go just before the done column.
- Column changes save as they're made (no Save button), with a toast.
- "Set as done" clears the old done column first, then sets the new one, in one transaction (partial unique index).

## Members (milestone 7 builds the invite parts)
- Invite by email (owner only), on an espresso card: validates the address; an existing member shows "<name> is already a member."; an email with a pending invite resends it ("There was already an invite for …, so we sent it again."); otherwise "Invite sent to …".
- Member list: initials avatar, name ("(you)" for the viewer), email · N tasks, Owner (espresso + lime) or Member (outline) badge.
- Remove (owner only, never on the owner): inline confirm in the row, "Remove Ada? Their 3 tasks will be unassigned.", then Remove (danger). Toast: "<name> removed".
- Pending invites (owner only): email, "Sent N days ago · expires in N days" or "Expired. Resend to send a fresh link." in danger red, Resend and Cancel invite.

## Danger zone
- Owner: "Delete project" → dialog listing what's deleted (board, all N tasks, columns, members, invites, for everyone), unlocked by typing the project name exactly. Then go to /projects with a toast.
- Member: "Leave project" → dialog: "It disappears from your projects. Your N tasks here become unassigned. The owner can invite you again later." Then go to /projects.
