-- Per-user pinning and recency on ProjectMember (milestone 5). Both nullable: no backfill needed.
-- AlterTable
ALTER TABLE "ProjectMember" ADD COLUMN     "lastOpenedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedAt" TIMESTAMP(3);
