# App screens: design notes and decisions

Reference files (open in a browser for layout only; they run inside the design tool, so read them for structure, spacing and copy, don't import them):
- `sidebar.dc.html`: the app sidebar (milestone 1 shell, plus the "Your projects" quick list with pinned markers)
- `sidebar-and-pinning.md`: the sidebar, pinning and recency rules (milestone 5)
- `dashboard.dc.html`: milestone 8
- `projects.dc.html`: projects list and New project dialog, milestone 5
- `board.dc.html`: board, task drawer, column menu and delete-column dialog, milestone 6
- `settings.dc.html`: account settings, milestone 9
- `landing.dc.html`: updated landing (user-facing copy, smaller type scale)

## Sidebar
- Logo, Dashboard / Projects / Settings, then "Your projects". Nothing at the bottom (the tip card is gone).
- "Your projects": colour square + name, each linking to its board. **At most 3**:
  1. My pinned projects first, oldest pin first.
  2. Remaining slots filled with the projects I opened most recently (`lastOpenedAt`, falling back to `joinedAt`). No duplicates.
  3. Pinned items show a small lime pin icon with the accessible name "Pinned".
- Hidden only when I have no projects. No loading or error states in the sidebar: it shows nothing until the list arrives.
- "Recent" means opened by me, not updated by anyone (the card's "Updated …" line uses the other meaning).

## Dashboard (milestone 8)
- Header: "Morning, <first name>." with the lime highlight on the name; summary line "You have N overdue and N due this week".
- Four stat cards: Assigned to me, Due this week, Overdue (number in danger red when > 0), Completed this week (lime card). Clicking one filters My tasks; clicking again or the chip clears it. The filter lives in the URL (`?filter=overdue`).
- My tasks grouped Overdue / Today / This week / Later / No due date. The checkbox moves the task to its project's done column (optimistic). Completed tasks stay visible struck through until the next refetch.
- Right column: project progress (bar in project colour), next 7 days (today highlighted, one dot per task), open work by priority (split bar + legend).
- Bottom row: completed per day for 14 days (today's bar lime) and team activity.
- New user (no projects): one empty state only, "Create your first project".

## Projects (milestone 5)
- Under the title: "Pinned projects come first. Your first 3 pins show in the sidebar."
- Filter tabs: All / Owned by me / Shared with me (URL `?filter=`).
- Order within the active tab: pinned projects first (oldest pin first), then the rest by "updated", newest first.
- Pin toggle: 44px, top-right of every card, outside the card's link (no button inside a link). `aria-pressed`, labelled "Pin <name>" / "Unpin <name>". Pinned: lime background, filled pin. Not pinned: white, outlined pin. Any member can pin; no cap.
- Pinning is optimistic: the cached list changes straight away; if the request fails it is undone and an error toast shows.
- Toasts: "<name> pinned to your sidebar" (pins 1–3), "<name> pinned (only your first 3 pins show in the sidebar)" (pin 4 and later), "<name> unpinned".
- Card: colour tile with first letter, Owner (espresso + lime) or Member (outline) badge, the description under the name (clamped to 2 lines with an ellipsis; nothing when empty), "Updated ..." line, done/total + percentage + bar, member avatars, and either "N overdue" (red chip) or the next due date.
- Dashed "New project" card at the end of the grid, plus the Create button, both open the dialog.
- New project dialog: live preview (the description shows under the name as you type, instead of "Preview"), name (required, max 60), an optional Description (3 rows, placeholder "e.g. Rebuilding the marketing site before the January launch", counter "N / 200"), 8 colours; Create is disabled until the name has text. On success: toast "<name> created" and open the new board.

## Board (milestone 6)
- Header: colour tile, name, the description as a subtitle when set (the owner sees a quiet "+ Add a description" when it's empty, which opens an inline field: Enter or blur saves, Esc cancels; members see nothing), "N tasks · N done · N members", member avatars, settings button (Invite arrives in milestone 7).
- Columns: each header has a grip handle ("Move column <name>"), for every member; columns are dragged only by it. The owner's drags change the team order; a member's change only their own view, shown as "Your order" with "Reset to team order" near the header. Keyboard: focus the handle, Space, left/right arrows, Space (Esc cancels). Both are optimistic.
- Add column: the owner always; a member while "Members can add columns" is on, with "N of M member columns used", disabled with the limit message at the limit, and hidden when the switch is off.
- Column menu: "Added by <name> · <date>" at the top; Rename for the owner and for the member who added that column; Set as done and Delete for the owner only.
- Filters: priority pills (All/High/Medium/Low) and "Only my tasks" (UI slice).
- Columns are 300px; the done column shows a "Done column" badge and its cards are struck through with a green date.
- Due chips: "Nd late" in danger red, "Today" espresso, "Tomorrow", otherwise "20 Nov".
- Drop target: the column gets a dashed espresso outline and a warm background.
- Quick add at the bottom of each column: Enter adds and keeps the field open, Esc closes.
- Column menu: Rename (inline), Set as done column, Delete column; on the last column, "A board needs at least one column" instead of Delete.
- Task drawer slides in from the right (460px), URL `?task=<id>`: title, column select (the keyboard alternative to dragging), assignee, priority, due date, description, recent activity, Delete task. Changes save automatically. Esc or the overlay closes it.
- Delete-column dialog: empty column → simple confirm. With tasks → "Move them, then delete the column" (default, with a target select) or "Delete the column and its N tasks" (danger, unlocked by typing the column name). Button label follows the choice.

## Account settings (milestone 9)
- Two-column sections: title + description on the left, card on the right.
- Profile: initials avatar, name (Save enabled only when changed), read-only email with a note.
- Password: current/new/confirm with live checks, the strength meter under the new password, and one show/hide toggle; GitHub-only users see "You sign in with GitHub" instead.
- Session: "Signed in with ..." and Sign out (danger outline).

## Email verification
- **`/verify-email`** (auth shell, deep plum panel: "One code and you're in." with a wiggling envelope; the form on the left):
  - "Confirm your email" and "We sent a 6-digit code to <email>."
  - Six boxes under "Your 6-digit code": numeric keyboard (`inputMode="numeric"`), the first with `autocomplete="one-time-code"` so phones offer the code from the email. Typing moves to the next box, Backspace on an empty box moves back, the arrow keys move between boxes, and pasting a whole code fills all six from any box. It submits by itself on the sixth digit; a "Confirm email" button does the same.
  - Under the boxes, one message line: "Wrong code. N attempts left." (the boxes clear for another try), "This code has expired. Send a new one.", "Too many attempts. Send a new code.", or "Checking your code…". Then "Can't find it? Check your spam folder." (Gmail often files our emails as spam for now.)
  - "Resend code": "Resend code in 42s" and disabled for 60 seconds after each send; after 3 codes in an hour, "You've asked for 3 codes in the last hour. You can ask again in N minutes." A new code clears the boxes. "Do this later" goes to the dashboard.
  - Success: toast "Email confirmed", then back to `callbackUrl` (same-site only) or the dashboard. Already verified: "Your email is confirmed" and Continue.
- **`/verify-email/link/[token]`** (same shell): "Confirm your email", "One click and your email is confirmed." and a "Confirm my email" button. Opening the page does nothing; only the click does (scanners open links). Then "Email confirmed" with "Go to Flowboard", or "This link has expired" / "This link was already used" / "This link doesn't work", each with "Send a new code".
- **Banner** (app shell, under the top bar, status-medium yellow): "Confirm your email to invite people." with "Enter code" (to `/verify-email`, coming back to this page), "Resend code" (toast "We sent a new code to <email>.") and a dismiss button. Dismissed for the browser tab's session; back on the next visit until verified.
- **Invite form, unverified** (the board's Invite dialog and the settings Members card share it): "Invite by email", "Confirm your email before inviting people." and an "Enter code" button instead of the email field.

## New-password fields
- Live checks: "At least 10 characters", "One special character", "Passwords match".
- "Passwords can't contain < or >" appears under the field as soon as one is typed (other errors wait until the field is left or the form submitted).
- **Strength meter** under the new-password field (sign-up, reset, change): a 3-part bar plus "Password strength: Weak / Fair / Strong", announced politely (`aria-live`). Weak fills one part in danger red, Fair two in warning amber, Strong three in success green (`--feedback-warning`, `--feedback-success`); the word is always shown, so colour is never the only signal. It guides but never blocks submitting.
- Scoring (`src/utilities/helpers/passwordStrength.ts`): length points (10–11: 1, 12–13: 2, 14–15: 3, 16–19: 4, 20+: 5), plus one per kind of character beyond the first (lowercase, uppercase, digits, symbols), minus 2 for repeats (aaa, or 4 or fewer different characters) and 1 for a simple sequence (abc, 123, qwerty, forwards or backwards). Strong from 6, Fair from 4. Always Weak while a rule fails, including containing your name or email.

## Decisions that change the plan docs
1. **Project colour is stored as a key, not hex**: `vermilion | espresso | lime | blue | teal | plum | amber | rose`. The frontend maps keys to tokens and to a readable text colour. (Amends `docs/plan/03-data-model.md`: Project.colour is an enum.)
2. **New columns are inserted just before the done column**, so Done stays last.
3. **Deleting the done column moves the isDone flag** to the column the tasks were moved to, or to the last remaining column. A project always has exactly one done column.
4. **Quick-added tasks** start as MEDIUM priority, unassigned, no due date.
5. **Deleting a task** has no confirmation dialog; the toast offers Undo for about 5 seconds (soft delete in the cache, the request fires when the toast closes).
6. **Danger colour** is #B3261E (delete actions, overdue numbers, late chips). Primary hover stays a darker vermilion.
