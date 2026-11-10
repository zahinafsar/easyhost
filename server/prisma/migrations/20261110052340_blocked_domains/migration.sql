/*
  Warnings:

  - You are about to drop the `blocked_emails` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "blocked_emails";

-- CreateTable
CREATE TABLE "blocked_domains" (
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_domains_pkey" PRIMARY KEY ("domain")
);
