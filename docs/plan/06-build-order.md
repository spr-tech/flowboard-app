# 6. Build order

Each milestone is a branch off `rebuild` (for example `rebuild-m3-auth`) and ends with a pull request into `rebuild` and a working Vercel preview.

| # | Milestone | Done when |
|---|---|---|
| 0 | Designs for every screen in `02-screens.md` | All screens designed (outside Claude Code) |
| 1 | Foundation: structure, tokens + fonts in `src/app/globals.css`, base UI (Button, Input, Dialog, Drawer, Toast), app shell | Empty shell renders in the new brand on desktop and phone |
| 2 | Database: full schema, migration, seed script | One command builds a fresh database with demo data |
| 3 | Auth: Auth.js + Prisma adapter, register, login, GitHub, middleware on all app routes, passwordChangedAt check, forgot/reset with Nodemailer + Gmail SMTP (port 587, requireTLS), rate limiting | GitHub sign-in creates a real User row; a reset email works once |
| 4 | API core + Redux base: route-handler wrapper, store, serviceConfig, setupListeners, /api/me | A component shows the user's name via RTK Query |
| 5 | Projects: service, routes, projects page, create modal, settings (General, Danger zone) | Create, rename, recolour, delete with typed confirmation |
| 6 | Board + tasks: columns, tasks, drag and drop, task drawer, column settings, delete-column dialog | Dragging is instant; a failed move snaps back with a toast; the done column sets completedAt |
| 7 | Members + invites: invite, resend, cancel, accept page (4 states), remove, leave. The invite email includes the project's description when it has one | A second account accepts an invite, sees the board, and is unassigned when removed |
| 8 | Dashboard: all sections, split endpoints, activity polling | Account B's move appears in account A's feed within about 30 s |
| 9 | Account settings | Name and password changes work |
| 10 | Polish + ship: skeletons, errors, phone pass, accessibility pass, landing/sign-in/sign-up from the designs, cutover | Live on `master` |

Queued follow-ups (each its own branch):
- Set a password for accounts without one (Google and GitHub), plus the forgot-password email wording for them.

Throughout:
- Write Activity rows inside each service from milestone 5 onward.
- Unit-test the position calculation (between, top, bottom, empty, re-space) with Vitest.
- Cypress tests for sign up, create project, drag a card.
