/*
  Warnings:

  - You are about to drop the `api_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `email_senders` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "api_keys" DROP CONSTRAINT "api_keys_projectId_fkey";

-- DropForeignKey
ALTER TABLE "email_logs" DROP CONSTRAINT "email_logs_projectId_fkey";

-- DropForeignKey
ALTER TABLE "email_senders" DROP CONSTRAINT "email_senders_projectId_fkey";

-- DropTable
DROP TABLE "api_keys";

-- DropTable
DROP TABLE "email_logs";

-- DropTable
DROP TABLE "email_senders";

-- DropEnum
DROP TYPE "EmailStatus";
