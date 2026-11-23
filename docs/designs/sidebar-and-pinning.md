# Sidebar and pinning: design notes (milestone 5)

References: `sidebar.dc.html`, `projects.dc.html` (layout and copy only; they run in the design tool).

## Sidebar
- Logo, then Dashboard / Projects / Settings, then "Your projects". Nothing else: no tip card or filler at the bottom.
- "Your projects" shows at most 3 projects:
  1. Pinned projects first, oldest pin first (pin order), regardless of recent activity.
  2. Remaining slots filled with the projects this user opened most recently (ProjectMember.lastOpenedAt, falling back to joinedAt). No duplicates.
  3. Pinned items show a small lime pin icon (accessible name "Pinned").
  4. Hidden only when the user has no projects.
- Each item: colour square + project name, links straight to that board.

## Pinning
- Pins are per user: ProjectMember.pinnedAt (nullable DateTime). Any member can pin, not just the owner.
- Projects page: a 44px pin toggle in the top-right of every card (aria-pressed, labelled "Pin <name>" / "Unpin <name>"). Pinned: lime background with a filled pin; not pinned: white with an outlined pin. The toggle sits outside the card link (no button inside a link).
- Pinned projects sort first on the projects page, in pin order; the active filter tab still applies.
- Under the page title: "Pinned projects come first. Your first 3 pins show in the sidebar."
- Toasts: "<name> pinned to your sidebar" (pins 1–3), "<name> pinned (only your first 3 pins show in the sidebar)" (pin 4+), "<name> unpinned".
- Pinning is optimistic (instant in the UI), with undo and a toast if the request fails.
- There's no cap on how many projects can be pinned.

## Recency
- ProjectMember.lastOpenedAt is updated when the user opens a board, at most once a minute per user and project.
- "Recent" means recently opened by this user, not recently changed by anyone.
