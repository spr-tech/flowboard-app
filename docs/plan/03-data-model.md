# 3. Data model (`prisma/schema.prisma`)

## Tables
- **User**: name, email (unique), passwordHash (null for GitHub-only users), image, passwordChangedAt, timestamps.
- **Account**: the Auth.js adapter table linking a GitHub login to a User.
- **Project**: name, colour, timestamps. No `ownerId`.
- **ProjectMember**: userId, projectId, role (OWNER | MEMBER), joinedAt. Unique on (userId, projectId).
- **Column**: projectId, name, position, isDone (exactly one per project).
- **Task**: projectId, columnId, title, description, priority (LOW | MEDIUM | HIGH), position (float), dueDate, assigneeId (nullable User), createdById, completedAt, timestamps.
- **Invite**: projectId, email, tokenHash, invitedById, expiresAt, acceptedAt, createdAt.
- **PasswordResetToken**: userId, tokenHash, expiresAt, usedAt, createdAt.
- **Activity**: projectId, actorId, action (`task.created`, `task.moved`, `task.completed`, `member.joined`, `member.removed`, `project.created`, ...), taskId (nullable), meta (JSON, e.g. `{ "from": "In progress", "to": "Done" }`), createdAt.

## Rules
- Ownership lives only in ProjectMember.role. "My projects" = projects I'm a member of.
- A task is done when it's in the column with `isDone`. Moving in sets `completedAt`; moving out clears it. Overdue = dueDate in the past and no completedAt.
- Positions are spaced floats (1000, 2000, 3000). A moved card takes the midpoint of its neighbours; top = first − 1000; bottom = last + 1000; empty column = 1000. If a gap gets too small, re-space the whole column in the same transaction.
- Invite and password-reset tokens are stored only as hashes.
- Cascades: deleting a Project removes its members, columns, tasks, invites and activity. Deleting a Column removes its tasks (the UI guards this with a typed confirmation).
- Removing a member is not a database cascade: the service sets `assigneeId = null` on that user's tasks in that project, in the same transaction.
- On every request, Auth.js treats a session token issued before `passwordChangedAt` as signed out.

## Changes from the current schema
Add Account, Invite, PasswordResetToken, Activity; drop Project.ownerId; add ProjectMember.role; add Column.isDone; add Task.dueDate, assigneeId, createdById, completedAt; switch positions to spaced floats; add User.passwordChangedAt.
