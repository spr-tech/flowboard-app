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
- The milestone 3 auth routes (register, forgot and reset password) predate the wrapper and still use `errorResponse` directly; they move onto `route()` when next touched.

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

## Dashboard
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/dashboard/summary | Signed in | Counts + summary line |
| GET | /api/me/tasks?group=due | Signed in | My tasks grouped by due date |
| GET | /api/dashboard/projects | Signed in | Project progress rows |
| GET | /api/dashboard/stats | Signed in | 14-day completed, priority split, next 7 days |
| GET | /api/dashboard/activity | Signed in | Activity across my projects |

## Projects
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/projects | Signed in | My projects with progress + avatars |
| POST | /api/projects | Signed in | Project + OWNER membership + 3 default columns, one transaction |
| GET | /api/projects/:projectId | Member | Whole board: project, columns, tasks |
| PATCH | /api/projects/:projectId | Owner | Rename / recolour |
| DELETE | /api/projects/:projectId | Owner | Body has the typed project name |
| POST | /api/projects/:projectId/leave | Member, not owner | Leave, unassign my tasks |

## Columns
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/projects/:projectId/columns | Owner | Add a column at the end |
| PATCH | /api/columns/:columnId | Owner | Rename, reorder, set isDone |
| DELETE | /api/columns/:columnId | Owner | Body has `moveTasksTo` or the typed column name; never the last column |

## Tasks
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/projects/:projectId/tasks | Member | Title + column, added at the bottom |
| PATCH | /api/tasks/:taskId | Member | Title, description, priority, assignee, due date |
| PATCH | /api/tasks/:taskId/move | Member | `{ columnId, afterTaskId?, beforeTaskId? }`; the server computes the position |
| DELETE | /api/tasks/:taskId | Member | Delete |

## Members and invites
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/projects/:projectId/members | Member | Members with roles |
| DELETE | /api/projects/:projectId/members/:userId | Owner | Remove + unassign, one transaction |
| GET | /api/projects/:projectId/invites | Owner | Pending invites |
| POST | /api/projects/:projectId/invites | Owner | Invite by email |
| POST | /api/invites/:inviteId/resend | Owner | New token, expiry and email |
| DELETE | /api/invites/:inviteId | Owner | Cancel |
| GET | /api/invites/token/:token | Anyone | Preview: project, inviter, state |
| POST | /api/invites/token/:token/accept | Signed in | Join the project |

## Conventions
- Short paths for anything with an ID; the service finds its project and checks membership.
- Non-members get 404, not 403.
- Errors: `{ error: { code, message, fields? } }`. 400 bad input · 401 not signed in · 403 not allowed · 404 not found · 409 conflict · 429 too many requests.
- The browser turns these into one `AppError` and decides toasts and the 401 redirect in one place: see "Errors" in `05-state.md`.
- Every write returns the updated object.

## Moving a task (server side, one transaction)
1. Check membership; the target column is in the same project; neighbours (if given) are in the target column. Otherwise 400.
2. Position: between → midpoint; top → first − 1000; bottom → last + 1000; empty → 1000. Always use the neighbours' current positions from the database.
3. Into the isDone column → set completedAt; out of it → clear it.
4. Write an Activity row when the column changed (not for reorders within a column).
5. Re-space the column if the gap is too small.
6. Return the updated task.
