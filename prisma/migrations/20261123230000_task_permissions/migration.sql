-- Task permissions, managers and personal card order (feature-task-permissions).
-- Written by hand from `prisma migrate diff`. Add-only: nothing is dropped or rewritten except the
-- one backfill below. Project.membersCanAddColumns and memberColumnLimit stay, unused.

-- Roles: OWNER, MANAGER, MEMBER. Postgres 12+ allows ADD VALUE inside a transaction as long as
-- the new value isn't used in that same transaction (it isn't here).
ALTER TYPE "ProjectRole" ADD VALUE 'MANAGER';

-- Project: how many open tasks a member may take from the unassigned pool.
ALTER TABLE "Project" ADD COLUMN "memberTakeLimit" INTEGER NOT NULL DEFAULT 5;

-- ProjectMember: a member's own card order ({ columnId: taskId[] }) and a manager's switches.
ALTER TABLE "ProjectMember" ADD COLUMN "cardOrder" JSONB,
ADD COLUMN "permissions" JSONB;

-- Task: when a member took it from the pool, and when the owner first opened it.
ALTER TABLE "Task" ADD COLUMN "seenByOwnerAt" TIMESTAMP(3),
ADD COLUMN "takenFromPoolAt" TIMESTAMP(3);

-- Backfill: every existing task counts as already seen by the owner, so no old task shows "New".
UPDATE "Task" SET "seenByOwnerAt" = "createdAt";

-- TaskNote: short notes under a task's description.
CREATE TABLE "TaskNote" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskNote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TaskNote_taskId_createdAt_idx" ON "TaskNote"("taskId", "createdAt");

ALTER TABLE "TaskNote" ADD CONSTRAINT "TaskNote_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TaskNote" ADD CONSTRAINT "TaskNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
