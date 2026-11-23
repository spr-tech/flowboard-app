-- Column permissions, personal column order and the project description (milestone 6).
-- Written by hand from `prisma migrate diff`: Column.createdById is added nullable, backfilled,
-- then made required, so existing columns get a creator instead of failing the NOT NULL.

-- Project: an optional description; may members add columns, and how many member-created
-- columns in total.
ALTER TABLE "Project" ADD COLUMN "description" TEXT,
ADD COLUMN "memberColumnLimit" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN "membersCanAddColumns" BOOLEAN NOT NULL DEFAULT false;

-- ProjectMember: this member's own column order (JSON list of column ids); null = team order.
ALTER TABLE "ProjectMember" ADD COLUMN "columnOrder" JSONB;

-- Column: who added it, and when.
ALTER TABLE "Column" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "createdById" TEXT;

-- Backfill: every existing column was created by its project's owner, when the project was.
UPDATE "Column" AS c
SET "createdById" = pm."userId",
    "createdAt" = p."createdAt"
FROM "Project" AS p
JOIN "ProjectMember" AS pm ON pm."projectId" = p."id" AND pm."role" = 'OWNER'
WHERE c."projectId" = p."id";

ALTER TABLE "Column" ALTER COLUMN "createdById" SET NOT NULL;

ALTER TABLE "Column" ADD CONSTRAINT "Column_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
