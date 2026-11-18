# 4. API (Next.js Route Handlers)

Every handler: check the session → validate with Zod → call the service → return. "Who" is enforced inside the service.

## Auth
| Method | Path | Who | What |
|---|---|---|---|
| POST | /api/auth/register | Anyone | Create an email account |
| GET/POST | /api/auth/[...nextauth] | Anyone | Auth.js: sign in/out, GitHub callback, session |
| POST | /api/auth/forgot-password | Anyone | Send the reset email; same response always; rate limited |
| POST | /api/auth/reset-password | Valid token | Set password, update passwordChangedAt, mark token used |

## Account
| Method | Path | Who | What |
|---|---|---|---|
| GET | /api/me | Signed in | Current user |
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
- Every write returns the updated object.

## Moving a task (server side, one transaction)
1. Check membership; the target column is in the same project; neighbours (if given) are in the target column. Otherwise 400.
2. Position: between → midpoint; top → first − 1000; bottom → last + 1000; empty → 1000. Always use the neighbours' current positions from the database.
3. Into the isDone column → set completedAt; out of it → clear it.
4. Write an Activity row when the column changed (not for reorders within a column).
5. Re-space the column if the gap is too small.
6. Return the updated task.
