/*
  Warnings:

  - You are about to drop the column `userId` on the `api_keys` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `buckets` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `databases` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `email_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `email_senders` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectId]` on the table `buckets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId]` on the table `databases` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectId` to the `api_keys` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `buckets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `databases` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `email_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `email_senders` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_userId_fkey";

-- DropForeignKey
ALTER TABLE "buckets" DROP CONSTRAINT "buckets_userId_fkey";

-- DropForeignKey
ALTER TABLE "databases" DROP CONSTRAINT "databases_userId_fkey";

-- DropForeignKey
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_userId_fkey";

-- DropForeignKey
ALTER TABLE "email_senders" DROP CONSTRAINT "email_senders_userId_fkey";

-- DropIndex
DROP INDEX "api_keys_userId_idx";

-- DropIndex
DROP INDEX "buckets_userId_name_key";

-- DropIndex
DROP INDEX "databases_userId_name_key";

-- DropIndex
DROP INDEX "email_logs_userId_createdAt_idx";

-- DropIndex
DROP INDEX "email_senders_userId_idx";

-- AlterTable
ALTER TABLE "api_keys" DROP COLUMN "userId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "buckets" DROP COLUMN "userId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "databases" DROP COLUMN "userId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "email_logs" DROP COLUMN "userId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "email_senders" DROP COLUMN "userId",
ADD COLUMN     "projectId" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "api_keys_projectId_idx" ON "api_keys"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "buckets_projectId_key" ON "buckets"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "databases_projectId_key" ON "databases"("projectId");

-- CreateIndex
CREATE INDEX "email_logs_projectId_createdAt_idx" ON "email_logs"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "email_senders_projectId_idx" ON "email_senders"("projectId");

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "buckets" ADD CONSTRAINT "buckets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "databases" ADD CONSTRAINT "databases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
