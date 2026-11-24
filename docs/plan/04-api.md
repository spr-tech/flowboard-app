# 4. API (Next.js Route Handlers)

Every handler: check the session → validate with Zod → call the service → return. "Who" is enforced inside the service.

## The route-handler wrapper (built in milestone 4)
Every handler goes through `route(options, handler)` in `src/server/lib/route.ts`, so none of the steps can be forgotten:

```ts
export const GET = route({ auth: true }, ({ user }) => getMe(user.id));
export const PATCH = route({ auth: true, body: updateMeSchema }, ({ user, body }) => updateMe(user.id, body));
```

- `auth: true` → 401 `UNAUTHENTICATED` ("Your session has ended. Please sign in again.") without a signed-in user, and 403 `EMAIL_NOT_VERIFIED` ("Confirm your email to use Flowboard.") when the email isn't confirmed: the verification gate. `auth()` runs our jwt callback, which also ends sessions older than `passwordChangedAt` and reloads `emailVerified`, so one check covers all of it. Every route states `auth` explicitly in its first line, so new routes are gated by default.
- `auth: "allowUnverified"` → signed in is enough. Only `GET /api/me`, the four `verify-email` routes for signed-in users (status, send, code, start-over) and accepting an invite; a test lists them. The browser's error wrapper sends `EMAIL_NOT_VERIFIED` to `/verify-email?callbackUrl=<this page>` instead of a toast.
- `params`, `query` and `body` schemas (Zod) → typed values for the handler, or 400 `VALIDATION_FAILED` with `fields`. Next 15's `params` Promise is awaited by the wrapper. The body is only read when a `body` schema is given.
- The handler returns a plain value (sent as JSON, status 200 or `status`) or a `Response`. Anything thrown goes through `errorResponse`: an `ApiError` keeps its status and code; anything else is a logged 500 with no details sent.
- Membership checks (404 for non-members) stay in the services; the wrapper never knows about projects.
- The wrapper's second argument must stay required: `next build` checks it is assignable to `{ params: Promise<…> }`.
- `auth: false` (public routes: register, forgot-password, reset-password, verify, verify-email/link) never reads the session: no database work, the same timing for everyone, and `user` is `null`.

## Auth
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/auth/register | Anyone | Create an email account and send the confirm-your-email code. Body: the sign-up form, plus an optional `inviteToken`. 201 with `{ id, name, email, needsEmailCode }`; 409 `EMAIL_TAKEN`. The form then signs in and goes to `/verify-email` (or, when `needsEmailCode` is false, straight to the invite) |
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
- Middleware protects `/dashboard`, `/projects`, `/settings` and exactly `/verify-email` (with `callbackUrl`; `/verify-email/link/...` stays public), and sends signed-in users from `/login`, `/register` and `/forgot-password` to `/dashboard`. `callbackUrl` only ever leads to a path on our own site.

## Email verification
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/auth/verify-email/status | Signed in | `{ email, isVerified, resendAvailableAt, sendsLeftThisHour }`, so `/verify-email` can show the resend countdown and the hourly limit after a reload |
| POST | /api/auth/verify-email/send | Signed in | Send a new code and link (older ones stop working). 200 with the status after sending; 429 `SEND_TOO_SOON` within a minute of the last send, 429 `SEND_LIMIT` after 3 in an hour; 400 `ALREADY_VERIFIED`; 502 `EMAIL_NOT_SENT` |
| POST | /api/auth/verify-email/code | Signed in | `{ code }` (6 digits). 200 with the user (`GET /api/me`'s shape), now verified. 400 `CODE_WRONG` ("Wrong code. N attempts left."), `CODE_EXPIRED` ("This code has expired. Send a new one."), `TOO_MANY_ATTEMPTS` ("Too many attempts. Send a new code.") |
| POST | /api/auth/verify-email/start-over | Signed in (unverified) | "Use a different email". 200 `{ deleted }`: the account was deleted if it was unverified and empty, kept otherwise. 400 `ALREADY_VERIFIED`. The browser then signs out to `/register` |
| POST | /api/auth/verify-email/link | Anyone | `{ token }` from the email's link. 200 with `{ email }`. 400 `TOKEN_EXPIRED`, `TOKEN_USED` (also when a newer email replaced it), `TOKEN_INVALID` |

Email verification notes:
- All through `route()` and `src/server/auth/emailVerification.service.ts`, with the shared Zod schemas in `src/models/validations/emailVerificationValidation.ts`.
- The email: subject "Your Flowboard code: 123456"; the code large and spaced out, "It expires in 15 minutes."; a "Confirm my email" button as a backup (24 hours); "If you didn't create a Flowboard account, you can ignore this email." Its link uses `APP_URL`, like the reset and invite emails. It's sent after the database write, never inside a transaction.
- Sending locks the user's row inside the transaction, so two sends at the same moment take turns and can't pass the hourly limit together.
- The link is only used by a POST from the page's button, never by opening the page, so email scanners that open links can't use it up.
- GitHub sign-ins set `emailVerified` if it's empty (Auth.js `signIn` event). Accepting an invite sets it too, in the accept transaction.

## Account
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/me | Signed in | Current user: `{ id, name, email, image, hasPassword, emailVerified }` (`hasPassword` false for GitHub-only accounts; `emailVerified` a boolean, never the date). Built in milestone 4 |
| PATCH | /api/me | Signed in | Update name |
| PATCH | /api/me/password | Email users | Current + new password |

Account notes (milestone 9):
- PATCH /api/me takes `{ name }` (3 to 80 characters, trimmed) and returns me.
- PATCH /api/me/password takes `{ currentPassword, password, confirmPassword }`. A wrong current password, the same password again, a common one, or one containing the name or email is a 400 with the message on that field. Saving sets `passwordChangedAt`, which ends every session that signed in earlier; the route then signs this device in again with the new password (a fresh session cookie on the response), so only other devices are signed out. GitHub-only accounts: 400 `NO_PASSWORD`.
- **New-password rules** (sign-up, reset, change; existing shorter passwords still sign in): no `<` or `>` (checked first, so it's the message shown: "Passwords can't contain < or >"); at least 10 characters; at most 72 UTF-8 bytes (bcrypt's limit); at least one special character, meaning anything but a letter or a digit in any alphabet, spaces included, and not `<` or `>` ("Add at least one special character, like ! or #"); every other character allowed; not containing the email's name part (before any "+") or a word of the name, when 4+ characters; not one of the 10,000 most common passwords (SecLists; only its 10+ character entries are kept, in `src/server/auth/commonPasswords.ts`, server only, regenerated by `scripts/build-common-passwords.mjs`). The length rules and the name/email rule are in the shared schema; the server also checks the list and the name/email rule against the account itself.
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
| GET | /api/projects/:projectId | Member | The whole board: the project (with `description`), its columns in the team order (each with `createdBy { id, name }` and `createdAt`), every task (by column, then position), the members (owner, managers, members; each with `role` and a manager's `permissions`), `memberTakeLimit`, and `me` (`role`, `permissions`, my `columnOrder` and `cardOrder` (null when I change the team order), and `takenOpenCount`). Also records my visit: `lastOpenedAt`, at most once a minute |
| PATCH | /api/projects/:projectId | Owner | Any of `name`, `colour`, `description` (trimmed; empty → null; max 200), `memberTakeLimit` (1–20). Only what changed is written. General changes write `project.updated` (before/after); the take limit writes `project.take_limit_changed` |
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
| POST | /api/projects/:projectId/columns | Owner; managers with manageColumns | `{ name }` (max 40). Inserted just before the done column; `createdById` is the caller. Others: 403 `FORBIDDEN`. 201 with the column |
| PATCH | /api/columns/:columnId | Owner; managers with manageColumns to rename | `{ name?, isDone?: true }`. `isDone: true` is owner-only (403 `OWNER_ONLY`) and makes this the done column (see 03-data-model). Returns the column |
| PATCH | /api/columns/:columnId/move | Owner; managers with manageColumns | The team order: `{ afterColumnId?, beforeColumnId? }`; the server computes the position (re-spacing all the project's columns if needed) and writes `column.moved`. Others get 403. Returns the column |
| PUT | /api/projects/:projectId/column-order | Whoever doesn't change the team order | `{ columnIds }`: my own order (each id once, all this project's; else 400 `UNKNOWN_COLUMN`). The owner and managers with manageColumns get 400 `USES_TEAM_ORDER`. No Activity row. Returns `{ projectId, columnOrder }` |
| PUT | /api/projects/:projectId/card-order | Whoever doesn't change the team task order | `{ columnId, taskIds }`: my own top-to-bottom order of one column (each id once, all tasks of that column; else 400 `UNKNOWN_TASK`). The owner and managers with teamOrder get 400 `USES_TEAM_ORDER`. No Activity row. Returns `{ projectId, cardOrder }` |
| DELETE | /api/projects/:projectId/column-order | Member | Back to the team order for both columns and cards (`columnOrder` and `cardOrder` null) |
| DELETE | /api/columns/:columnId | Owner; managers with deleteColumns (never the done column: 403 `OWNER_ONLY`) | `{ moveTasksTo }` (tasks go to the bottom of that column, in order) or `{ confirmName }` (exact name, else 400 `NAME_MISMATCH`; deletes the tasks too). Never the last column (400 `LAST_COLUMN`). Returns `{ id }` |

Column notes: refusals come from `can()` (403 `FORBIDDEN` with its reason; `OWNER_ONLY` for the done column); a column in a project I'm not in is 404 `COLUMN_NOT_FOUND`. The column writes return the column; the board refetches the project, because a done-column switch also changes tasks.

## Tasks
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/projects/:projectId/tasks | Member | `{ title, columnId, description?, dueDate?, assigneeId? }`. Added at the bottom, MEDIUM. The owner and managers with createAndAssign: as sent (title only from quick add: unassigned, no due date). Everyone else: assigned to themselves, description of 20+ characters (else 403 `TASK_FORBIDDEN` with a `description` field message), another assignee 403. Members' tasks start unseen by the owner. 201 with the task |
| PATCH | /api/tasks/:taskId | Member | Any of `title`, `description`, `priority`, `assigneeId` (a project member, else 400 `ASSIGNEE_NOT_MEMBER`), `dueDate` (YYYY-MM-DD); `null` clears. Writes only what changed, and checks each changed field with `can()` (403 `TASK_FORBIDDEN`). Reassigning clears `takenFromPoolAt`. Returns the task |
| PATCH | /api/tasks/:taskId/move | Member | `{ columnId, afterTaskId?, beforeTaskId? }`; the server computes the position. Another column needs `can("task.move")`. Within a column, only whoever changes the team task order (others use card-order). See "Moving a task". Returns the task |
| DELETE | /api/tasks/:taskId | Member | Delete (members: tasks they created; managers need deleteAnyTask). Its activity stays. Returns `{ id }` |
| POST | /api/tasks/:taskId/take | Member | "Assign to me": unassigned tasks only (else 409 `TASK_ALREADY_ASSIGNED`), not in the done column (else 409 `TASK_DONE`); members up to the take limit (409 `TAKE_LIMIT_REACHED` with the message). Writes `task.taken`. Returns the task |
| POST | /api/tasks/:taskId/seen | Owner | Clears the "New" badge (`seenByOwnerAt`). No Activity row. Returns the task |
| GET | /api/tasks/:taskId/notes | Member | The task's notes, oldest first: `{ id, taskId, body, createdAt, author { id, name, image } }` |
| POST | /api/tasks/:taskId/notes | Member | `{ body }` (1–1000, trimmed). Writes `task.note_added`. 201 with the note |
| DELETE | /api/notes/:noteId | The author, or the owner | Writes `task.note_deleted` (who and which task, never the text). A note in a project I'm not in is 404 `NOTE_NOT_FOUND`. Returns `{ id }` |

Task notes: a task in a project I'm not in is 404 `TASK_NOT_FOUND`, like the project. Every refusal comes from `can()` and is 403 `TASK_FORBIDDEN` with the message the browser shows. A task is `{ id, columnId, title, description, priority, position, dueDate, assignee, completedAt, createdAt, createdById, takenFromPool, newForOwner }`, the same shape as in GET /api/projects/:projectId.

## Members and invites
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/projects/:projectId/members | Member | Members with roles and their task counts in this project (built in milestone 5) |
| PATCH | /api/projects/:projectId/members/:userId | Owner | `{ role: "MANAGER" \| "MEMBER" }`. Promote (default switches; at most 3 managers, else 409 `MANAGER_LIMIT`) or demote (switches cleared). Never the owner (400 `CANNOT_CHANGE_OWNER_ROLE`). Writes `member.promoted` / `member.demoted`. Returns `{ projectId, userId, role, permissions }` |
| PATCH | /api/projects/:projectId/members/:userId/permissions | Owner | Only the switches that changed, e.g. `{ deleteAnyTask: true }`. Managers only (400 `NOT_A_MANAGER`). Writes `manager.permissions_changed`. Returns `{ projectId, userId, role, permissions }` |
| DELETE | /api/projects/:projectId/members/:userId | Owner; managers with removeMembers (members only) | Remove + unassign, one transaction |
| GET | /api/projects/:projectId/invites | Owner; managers with inviteMembers | Pending invites |
| POST | /api/projects/:projectId/invites | Owner; managers with inviteMembers | Invite by email |
| POST | /api/invites/:inviteId/resend | Owner; managers with inviteMembers | New token, expiry and email |
| DELETE | /api/invites/:inviteId | Owner; managers with inviteMembers | Cancel |
| GET | /api/invites/token/:token | Anyone | Preview: project, inviter, state |
| POST | /api/invites/token/:token/accept | Signed in | Join the project |

Members and invites notes (milestone 7):
- Invites and resends need a confirmed email: otherwise 403 `EMAIL_NOT_VERIFIED` ("Confirm your email before inviting people."), checked after the membership check, so a project you're not in still answers 404. Cancelling stays allowed (it sends no email). Accepting an invite confirms the accepter's email, and stays open to unverified users. That's sound only because the token is never returned to the inviter: responses carry `{ id, email, sentAt, expiresAt }`, the database select never reads `tokenHash`, and the link goes in one email to the invitee (a test checks all of this).
- Invites: the owner and managers with inviteMembers (others 403 `FORBIDDEN`); the email is lowercased. Already a member → 409 `ALREADY_MEMBER` ("<name> is already a member.", as a field error on `email`). A pending invite (not accepted, not cancelled; expired ones too) for the same email is sent again on the same row with a new token and expiry, and the answer says `resent: true`. Tokens are 32 random bytes; only the SHA-256 hash is stored; they last 7 days.
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
1. Check membership (404 otherwise); the target column is in the same project (400 `COLUMN_NOT_FOUND`). Check `can()`: another column needs `task.move` (members: tasks assigned to them); a reorder within the column needs `task.reorderTeam` (403 `TASK_FORBIDDEN`).
   - Whoever doesn't change the team task order sends neighbours from their own card order. The server places the card there in their `cardOrder` (and drops it from the source column's list), and puts it at the TOP of the target column's team order. Steps 2–3 below are for the owner and managers with teamOrder.
2. Find the neighbours in the target column's current order, without the moved card. `afterTaskId` is the card it lands below, `beforeTaskId` the one it lands above; given one, the other side is whatever is next to it now; given none, the card goes to the bottom. A neighbour that isn't in that column, or two that aren't next to each other, is 400 `INVALID_POSITION` (the board changed under the user).
3. Position: between → midpoint; top → first − 1000; bottom → last + 1000; empty → 1000. If the gap is too small, re-space the column first (03-data-model).
4. Into the isDone column → set completedAt (reordering inside it keeps the original time); out of it → clear it.
5. Write an Activity row when the column changed: `task.completed` into the done column, otherwise `task.moved`. Nothing for reorders within a column.
6. Return the updated task.
