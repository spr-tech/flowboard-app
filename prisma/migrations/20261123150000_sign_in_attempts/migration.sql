-- Failed email-and-password sign-ins, for the rate limit (5 per email per 15 minutes).
-- Add-only: a new table and its index.

-- CreateTable
CREATE TABLE "SignInAttempt" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignInAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SignInAttempt_email_createdAt_idx" ON "SignInAttempt"("email", "createdAt");
