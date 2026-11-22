# 4. API (Next.js Route Handlers)

Every handler: check the session → validate with Zod → call the service → return. "Who" is enforced inside the service.

## The route-handler wrapper (built in milestone 4)
Every handler goes through `route(options, handler)` in `src/server/lib/route.ts`, so none of the steps can be forgotten:

```ts
export const GET = route({ auth: true }, ({ user }) => getMe(user.id));
export const PATCH = route({ auth: true, body: updateMeSchema }, ({ user, body }) => updateMe(user.id, body));
```

- `auth: true` → 401 `UNAUTHENTICATED` ("Your session has ended. Please sign in again.") without a signed-in user. `auth()` runs our jwt callback, which also ends sessions older than `passwordChangedAt`, so one check covers both. Every route states `auth` explicitly in its first line.
- `params`, `query` and `body` schemas (Zod) → typed values for the handler, or 400 `VALIDATION_FAILED` with `fields`. Next 15's `params` Promise is awaited by the wrapper. The body is only read when a `body` schema is given.
- The handler returns a plain value (sent as JSON, status 200 or `status`) or a `Response`. Anything thrown goes through `errorResponse`: an `ApiError` keeps its status and code; anything else is a logged 500 with no details sent.
- Membership checks (404 for non-members) stay in the services; the wrapper never knows about projects.
- The wrapper's second argument must stay required: `next build` checks it is assignable to `{ params: Promise<…> }`.
- `auth: false` (public routes: register, forgot-password, reset-password, verify) never reads the session: no database work, the same timing for everyone, and `user` is `null`.

## Auth
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/auth/register | Anyone | Create an email account. 201 with `{ id, name, email }`; 409 `EMAIL_TAKEN`. The form then signs in and goes to /dashboard |
| GET/POST | /api/auth/[...nextauth] | Anyone | Auth.js: sign in/out, GitHub callback, session |
| POST | /api/auth/forgot-password | Anyone | Send the reset email; same response always (the work runs after the response, so timing is the same too); rate limited |
| POST | /api/auth/reset-password/verify | Anyone | `{ token }` → `{ state: valid \| expired \| used \| invalid }`. Checks a link without using it, so the page can show the state before anyone types |
| POST | /api/auth/reset-password | Valid token | Set password, update passwordChangedAt, mark token used, cancel the user's other links (one transaction). 400 `TOKEN_INVALID` / `TOKEN_USED` / `TOKEN_EXPIRED` |
| GET | /auth/session-ended | Anyone | Not an API route: clears a session cookie the server no longer accepts (password changed, user gone) and redirects to `/login?reason=signed-out`. Takes `?callbackUrl=` (the base query adds it on a 401) and passes it on to /login, same-site paths only |

Auth notes:
- Reset links last 1 hour and work once. Asking for a new link cancels the older ones.
- The forgot-password rate limit (3 per address per hour) is silent: the answer is the same 200, because a 429 would reveal that the address has an account. Over the limit, nothing is sent.
- Reset emails go through `sendEmail` (`src/server/lib/email.ts`): Nodemailer, `smtp.gmail.com` port 587, STARTTLS with `requireTLS`. It logs `[email] sent` with the messageId, or `[email] NOT sent` with the full error, because the work runs after the response and nobody else would see a failure.
- GitHub sign-in with an email that already has a password account is refused (no automatic linking): Auth.js redirects to `/login?error=OAuthAccountNotLinked`, which shows "This email already has a Flowboard account. Sign in with your email and password."
- Middleware protects `/dashboard`, `/projects` and `/settings` (with `callbackUrl`), and sends signed-in users from `/login`, `/register` and `/forgot-password` to `/dashboard`. `callbackUrl` only ever leads to a path on our own site.

## Account
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/me | Signed in | Current user: `{ id, name, email, image, hasPassword }` (`hasPassword` false for GitHub-only accounts). Built in milestone 4 |
| PATCH | /api/me | Signed in | Update name |
| PATCH | /api/me/password | Email users | Current + new password |

Account notes (milestone 9):
- PATCH /api/me takes `{ name }` (3 to 80 characters, trimmed) and returns me.
- PATCH /api/me/password takes `{ currentPassword, password, confirmPassword }`. A wrong current password, the same password again, a common one, or one containing the name or email is a 400 with the message on that field. Saving sets `passwordChangedAt`, which ends every session that signed in earlier; the route then signs this device in again with the new password (a fresh session cookie on the response), so only other devices are signed out. GitHub-only accounts: 400 `NO_PASSWORD`.
- **New-password rules** (sign-up, reset, change; existing shorter passwords still sign in): at least 10 characters; at most 72 UTF-8 bytes (bcrypt's limit); any characters; not containing the email's name part (before any "+") or a word of the name, when 4+ characters; not one of the 10,000 most common passwords (SecLists; only its 10+ character entries are kept, in `src/server/auth/commonPasswords.ts`, server only, regenerated by `scripts/build-common-passwords.mjs`). The length rules and the name/email rule are in the shared schema; the server also checks the list and the name/email rule against the account itself.
- **Sign-in rate limit:** at most 5 failed email-and-password sign-ins per email in 15 minutes, counted in `SignInAttempt`. The 6th is refused before the password is checked ("Too many attempts. Try again in a few minutes."), for real and unknown emails alike. A successful sign-in clears the email's failures. GitHub sign-in isn't counted.

## Dashboard
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/dashboard/summary | Signed in | Counts + summary line |
| GET | /api/me/tasks?group=due | Signed in | My tasks grouped by due date |
| GET | /api/dashboard/projects | Signed in | Project progress rows |
| GET | /api/dashboard/stats | Signed in | 14-day completed, priority split, next 7 days |
| GET | /api/dashboard/activity | Signed in | Activity across my projects |
| GET | /api/tasks/:taskId/activity | Member | One task's history, for the task drawer (milestone 8) |

Dashboard notes (milestone 8):
- Every endpoint but the two activity feeds takes `?today=YYYY-MM-DD&tz=<IANA zone>`: the browser's own day and its time zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Due dates are days, compared with `today`; `completedAt` is a moment, turned into the browser's local day with `tz` ("completed this week", the 14-day chart). Both are validated; the server never works out "today" itself.
- "My" tasks are the ones assigned to me. Groups: Overdue (due before today), Today, This week (the next 6 days, a rolling week like the 7-day strip), Later, No due date. "Due this week" = today plus the next 6 days; "Completed this week" = the last 7 local days, today included.
- My tasks also lists tasks completed today (local), in their group, so a ticked task stays visible struck through. Each task carries its project's `doneColumnId` (ticking moves it there through PATCH /api/tasks/:taskId/move) and `reopenColumnId`, the first column in the team order that isn't the done column (unticking moves it back there).
- Projects: up to 5 rows in the sidebar's order (pinned first, then most recently opened), from the same figures as the projects page.
- Activity: the newest 20 rows, `{ id, action, meta, createdAt, actor, project, task }`; the browser writes the sentence. `task.updated` records the new assignee `{ id, name }` in meta when the assignee changed.

## Projects
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/projects?today=YYYY-MM-DD | Signed in | My projects as cards (with `description`): done/total, overdue count and next due date (against `today`), up to 4 member avatars (owner first), "updated", and `me: { role, pinnedAt, lastOpenedAt, joinedAt }`. Newest "updated" first; the browser applies pin order |
| POST | /api/projects | Signed in | `{ name, colour, description? }`. Project + OWNER membership + 3 default columns (To do / In progress / Done, created by the owner) + `project.created`, one transaction |
| GET | /api/projects/:projectId | Member | The whole board: the project (with `description`), its columns in the team order (each with `createdBy { id, name }` and `createdAt`), every task (by column, then position), the members (owner first), `columnPermissions { membersCanAddColumns, memberColumnLimit, memberColumnCount }` and `me` (with my `columnOrder`). Also records my visit: `lastOpenedAt`, at most once a minute |
| PATCH | /api/projects/:projectId | Owner | Any of `name`, `colour`, `description` (trimmed; empty → null; max 200), `membersCanAddColumns`, `memberColumnLimit` (1–10). Only what changed is written. General changes write `project.updated` (before/after); the column settings write `project.column_permissions_changed` |
| DELETE | /api/projects/:projectId | Owner | Body has the typed project name; 400 `NAME_MISMATCH` if it differs. Returns `{ id }` |
| POST | /api/projects/:projectId/leave | Member, not owner | Leave, unassign my tasks, `member.left`, one transaction |
| POST | /api/projects/:projectId/pin | Member (any role) | Pin for me. Already pinned → unchanged (keeps the first pin's time). Returns my updated membership `{ projectId, role, pinnedAt, lastOpenedAt, joinedAt }` |
| DELETE | /api/projects/:projectId/pin | Member (any role) | Unpin for me. Returns my updated membership |

Projects notes:
- Pins are per user and have no cap. Pins and visits write no Activity row (they are personal; see `03-data-model.md`).
- The visit write is one conditional `updateMany` (`lastOpenedAt` null or older than 60 seconds), so refreshes inside a minute don't write.
- Owner-only actions by a member → 403 `OWNER_ONLY`; any project action by a non-member → 404 `PROJECT_NOT_FOUND`.

## Columns
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/projects/:projectId/columns | Owner; members when allowed | `{ name }` (max 40). Inserted just before the done column; `createdById` is the caller. Members: 403 `COLUMNS_LOCKED` while the switch is off; 409 `COLUMN_LIMIT_REACHED` ("Column limit reached (3 of 3). The owner can raise it.") at the limit. 201 with the column |
| PATCH | /api/columns/:columnId | Owner; creator to rename | `{ name?, isDone?: true }`. A member may rename only a column they added (else 403 `NOT_YOUR_COLUMN`); `isDone: true` (owner) makes this the done column (see 03-data-model). Returns the column |
| PATCH | /api/columns/:columnId/move | Owner | The team order: `{ afterColumnId?, beforeColumnId? }`; the server computes the position (re-spacing all the project's columns if needed) and writes `column.moved`. Members get 403. Returns the column |
| PUT | /api/projects/:projectId/column-order | Member, not owner | `{ columnIds }`: my own order (each id once, all this project's; else 400 `UNKNOWN_COLUMN`). The owner gets 400 `OWNER_USES_TEAM_ORDER`. No Activity row. Returns `{ projectId, columnOrder }` |
| DELETE | /api/projects/:projectId/column-order | Member | Back to the team order (`columnOrder: null`) |
| DELETE | /api/columns/:columnId | Owner | `{ moveTasksTo }` (tasks go to the bottom of that column, in order) or `{ confirmName }` (exact name, else 400 `NAME_MISMATCH`; deletes the tasks too). Never the last column (400 `LAST_COLUMN`). Returns `{ id }` |

Column notes: members get 403 `OWNER_ONLY`; a column in a project I'm not in is 404 `COLUMN_NOT_FOUND`. The column writes return the column; the board refetches the project, because a done-column switch also changes tasks.

## Tasks
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/projects/:projectId/tasks | Member | `{ title, columnId }`. Added at the bottom, MEDIUM, unassigned, no due date. 201 with the task |
| PATCH | /api/tasks/:taskId | Member | Any of `title`, `description`, `priority`, `assigneeId` (a project member, else 400 `ASSIGNEE_NOT_MEMBER`), `dueDate` (YYYY-MM-DD); `null` clears. Writes only what changed. Returns the task |
| PATCH | /api/tasks/:taskId/move | Member | `{ columnId, afterTaskId?, beforeTaskId? }`; the server computes the position. Returns the task |
| DELETE | /api/tasks/:taskId | Member | Delete; its activity stays. Returns `{ id }` |

Task notes: a task in a project I'm not in is 404 `TASK_NOT_FOUND`, like the project. A task is `{ id, columnId, title, description, priority, position, dueDate, assignee, completedAt, createdAt }`, the same shape as in GET /api/projects/:projectId.

## Members and invites
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/projects/:projectId/members | Member | Members with roles and their task counts in this project (built in milestone 5) |
| DELETE | /api/projects/:projectId/members/:userId | Owner | Remove + unassign, one transaction |
| GET | /api/projects/:projectId/invites | Owner | Pending invites |
| POST | /api/projects/:projectId/invites | Owner | Invite by email |
| POST | /api/invites/:inviteId/resend | Owner | New token, expiry and email |
| DELETE | /api/invites/:inviteId | Owner | Cancel |
| GET | /api/invites/token/:token | Anyone | Preview: project, inviter, state |
| POST | /api/invites/token/:token/accept | Signed in | Join the project |

Members and invites notes (milestone 7):
- Invites: owner only; the email is lowercased. Already a member → 409 `ALREADY_MEMBER` ("<name> is already a member.", as a field error on `email`). A pending invite (not accepted, not cancelled; expired ones too) for the same email is sent again on the same row with a new token and expiry, and the answer says `resent: true`. Tokens are 32 random bytes; only the SHA-256 hash is stored; they last 7 days.
- The invite row is written first, then the email is sent. If sending fails, 502 `EMAIL_NOT_SENT`; the invite stays listed so Resend works.
- POST /invites and resend return the invite `{ id, email, createdAt, expiresAt, resent }`; GET /invites lists pending ones, newest first, expired ones included (the page marks them). Cancel stamps `cancelledAt` and returns `{ id }`.
- Remove: never the owner (400 `CANNOT_REMOVE_OWNER`); someone not in the project → 404 `MEMBER_NOT_FOUND`. Returns `{ projectId, userId, unassignedTaskCount }`.
- Preview states: `valid` (project name, colour, description, inviter, invited email), `expired` (inviter), `used`, `cancelled`, `invalid`, and `member` when the signed-in user is already in the project.
- Accept: the session's email must be the invited one (403 `INVITE_EMAIL_MISMATCH`); expired, used or cancelled → 400 `INVITE_EXPIRED` / `INVITE_USED` / `INVITE_CANCELLED`; unknown → 404 `INVITE_NOT_FOUND`. One transaction: MEMBER membership, `acceptedAt` (a conditional update, so two clicks can't both join), `member.joined`. Already a member: the invite is marked used and the project returned. Returns `{ projectId, projectName }`.

## Conventions
- Short paths for anything with an ID; the service finds its project and checks membership.
- Non-members get 404, not 403.
- Errors: `{ error: { code, message, fields? } }`. 400 bad input · 401 not signed in · 403 not allowed · 404 not found · 409 conflict · 429 too many requests.
- The browser turns these into one `AppError` and decides toasts and the 401 redirect in one place: see "Errors" in `05-state.md`.
- Every write returns the updated object.

## Moving a task (server side, one transaction)
1. Check membership (404 otherwise); the target column is in the same project (400 `COLUMN_NOT_FOUND`).
2. Find the neighbours in the target column's current order, without the moved card. `afterTaskId` is the card it lands below, `beforeTaskId` the one it lands above; given one, the other side is whatever is next to it now; given none, the card goes to the bottom. A neighbour that isn't in that column, or two that aren't next to each other, is 400 `INVALID_POSITION` (the board changed under the user).
3. Position: between → midpoint; top → first − 1000; bottom → last + 1000; empty → 1000. If the gap is too small, re-space the column first (03-data-model).
4. Into the isDone column → set completedAt (reordering inside it keeps the original time); out of it → clear it.
5. Write an Activity row when the column changed: `task.completed` into the done column, otherwise `task.moved`. Nothing for reorders within a column.
6. Return the updated task.
