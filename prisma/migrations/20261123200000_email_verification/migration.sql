-- Email verification: a 6-digit code plus a backup link per send (docs/plan/03-data-model.md).
-- Add-only: a new table, its indexes and foreign key, and one backfill that only fills empty values.

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "linkTokenHash" TEXT NOT NULL,
    "codeExpiresAt" TIMESTAMP(3) NOT NULL,
    "linkExpiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_linkTokenHash_key" ON "EmailVerificationToken"("linkTokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_createdAt_idx" ON "EmailVerificationToken"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing GitHub users count as verified (GitHub verifies primary emails). Only empty values are
-- filled; email-and-password users stay unverified until they confirm.
UPDATE "User" SET "emailVerified" = CURRENT_TIMESTAMP
WHERE "emailVerified" IS NULL
  AND EXISTS (SELECT 1 FROM "Account" WHERE "Account"."userId" = "User"."id" AND "Account"."provider" = 'github');
