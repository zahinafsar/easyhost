/*
  Warnings:

  - A unique constraint covering the columns `[accessKey]` on the table `buckets` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `accessKey` to the `buckets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secretKey` to the `buckets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "buckets" ADD COLUMN     "accessKey" TEXT NOT NULL,
ADD COLUMN     "secretKey" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "buckets_accessKey_key" ON "buckets"("accessKey");
