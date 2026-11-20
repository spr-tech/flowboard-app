# 3. Data model (`prisma/schema.prisma`)

## Tables
- **User**: name, email (unique, stored lowercase), emailVerified (required by the Auth.js adapter), passwordHash (null for GitHub-only users), image, passwordChangedAt, timestamps.
- **Account**: the Auth.js adapter table linking a GitHub login to a User. Unique on (provider, providerAccountId). No Session or VerificationToken tables: sessions are JWTs (JSON Web Tokens) and there are no magic links.
- **Project**: name, colour, timestamps. No `ownerId`. `colour` is the enum `ProjectColour`: `vermilion | espresso | lime | blue | teal | plum | amber | rose` (default `vermilion`). It stores a key, not hex; the frontend maps each key to a token and a readable text colour.
- **ProjectMember**: userId, projectId, role (OWNER | MEMBER, default MEMBER), joinedAt. Primary key (userId, projectId).
- **Column**: projectId, name, position (spaced float), isDone (exactly one per project).
- **Task**: projectId, columnId, title, description, priority (LOW | MEDIUM | HIGH, default MEDIUM), position (float), dueDate (a calendar day, `@db.Date`, no time), assigneeId (nullable User), createdById, completedAt, timestamps.
- **Invite**: projectId, email (stored lowercase), tokenHash, invitedById, expiresAt, acceptedAt, createdAt.
- **PasswordResetToken**: userId, tokenHash, expiresAt, usedAt, createdAt.
- **Activity**: projectId, actorId, action (a string such as `task.created`, `task.moved`, `task.completed`, `member.joined`, `member.removed`, `project.created`, ...), taskId (nullable), meta (JSON, e.g. `{ "title": "Fix login", "from": "In progress", "to": "Done" }`), createdAt.

## Rules
- Ownership lives only in ProjectMember.role. "My projects" = projects I'm a member of.
- Emails are lowercased before saving (User and Invite), in the seed now and in every service that writes an email.
- A task is done when it's in the column with `isDone`. Moving in sets `completedAt`; moving out clears it. Overdue = dueDate before today and no completedAt.
- **"Today" depends on the user's time zone**, but the server runs in UTC. This affects overdue, "Today" and due-this-week. Decide in milestone 8: either the browser sends its time zone with dashboard requests, or the client computes the grouping.
- **One done column per project.** A partial unique index (`Column_one_done_per_project`, on projectId where isDone) makes a second done column impossible; services make sure there is always one. So "Set as done column" must clear the old done column **before** setting the new one, in one transaction, or the index rejects it.
- Positions are spaced floats (1000, 2000, 3000). A moved card takes the midpoint of its neighbours; top = first − 1000; bottom = last + 1000; empty column = 1000. If a gap gets too small, re-space the whole column in the same transaction.
- Invite and password-reset tokens are stored only as hashes (SHA-256). Reset tokens are 32 random bytes, sent only in the email link.
- **Password reset rate limit:** at most 3 emails per address per hour, counted from PasswordResetToken rows created in the last hour. So rows are never deleted: "cancelling" an older link sets its `usedAt`. A GitHub-only user (no passwordHash) gets a "sign in with GitHub" email instead of a link; that also writes a row, born used, with the hash of a token nobody holds, so those emails count toward the limit too.
- **Sessions after a password change:** the session token records `authTime` (when it signed in). On every Node-side `auth()` call, the jwt callback (`src/server/auth/sessionToken.ts`) reloads the user and ends the session if `authTime < passwordChangedAt`. Middleware can't do this (Edge, no Prisma); the app layout sends such a session to `/auth/session-ended`, which clears the cookie.
- **One pending invite per email per project.** Inviting an email that already has a pending invite for the same project resends that invite (new token and expiry on the same row) instead of creating a second row. Enforced in the service (milestone 7).
- `Activity.action` is a string, not a Prisma enum: enum values can't contain dots and each new action would need a migration. The allowed values live in a TypeScript type in `src/utilities/enums/`.
- Cascades: deleting a Project removes its members, columns, tasks, invites and activity. Deleting a Column removes its tasks (the UI guards this with a typed confirmation). Deleting a Task keeps its activity rows (taskId becomes null; meta still holds the title).
- Deleting a User is not a v1 feature. Their accounts, memberships and reset tokens would cascade, but the database blocks it (Restrict) while they created tasks, invites or activity, so history is never lost silently.
- Removing a member is not a database cascade: the service sets `assigneeId = null` on that user's tasks in that project, in the same transaction.
- On every Node-side request, a session whose `authTime` is before `passwordChangedAt` is treated as signed out (see "Sessions after a password change" above). The token's own `iat` isn't used, because Auth.js refreshes it whenever it re-issues the cookie.

## Changes from the old schema
Add Account, Invite, PasswordResetToken, Activity; rename Member to ProjectMember with a role enum; drop Project.ownerId, description, status, dueDate; Project.color (hex string) becomes colour (enum); add Column.isDone; Column.order becomes position (float); add Task.projectId, createdById, completedAt; drop Task.status and label; Task.dueDate becomes date-only; switch positions to spaced floats; User.password becomes passwordHash; add User.emailVerified and passwordChangedAt.

## Local database commands
- `pnpm db:migrate`: create and apply a new migration after a schema change (`prisma migrate dev`).
- `pnpm db:seed`: wipe all tables and load the demo data (`prisma/seed.ts`).
- `pnpm db:reset`: drop everything, re-apply all migrations, then seed.
- `db:seed` and `db:reset` refuse to run unless `ALLOW_DB_RESET=true` is set, and print the database host before wiping. Set it only in your local `.env`, never on Vercel.
- Demo sign-in after seeding: `demo@example.com` (owner) or `sam@example.com` (member), password `Flowboard123!`.
