/*
  Warnings:

  - A unique constraint covering the columns `[projectId]` on the table `email_senders` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "email_senders_projectId_idx";

-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "buildCommand" TEXT,
ADD COLUMN     "installCommand" TEXT,
ADD COLUMN     "nodeVersion" TEXT,
ADD COLUMN     "rootDir" TEXT,
ADD COLUMN     "startCommand" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "email_senders_projectId_key" ON "email_senders"("projectId");
