/*
  Warnings:

  - You are about to drop the column `nodeVersion` on the `apps` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "apps" DROP COLUMN "nodeVersion",
ADD COLUMN     "packages" TEXT;
