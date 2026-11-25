/*
  Warnings:

  - You are about to drop the column `buildCommand` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `installCommand` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `packages` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `startCommand` on the `apps` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "apps" DROP COLUMN "buildCommand",
DROP COLUMN "installCommand",
DROP COLUMN "packages",
DROP COLUMN "startCommand",
ADD COLUMN     "dockerfile" TEXT;
