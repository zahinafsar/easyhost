-- CreateTable
CREATE TABLE "blocked_emails" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_emails_pkey" PRIMARY KEY ("email")
);
