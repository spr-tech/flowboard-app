-- Cancelling an invite keeps the row and stamps it, so the link can say it was cancelled.
-- AlterTable
ALTER TABLE "Invite" ADD COLUMN     "cancelledAt" TIMESTAMP(3);
