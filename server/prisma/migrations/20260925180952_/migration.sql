/*
  Warnings:

  - You are about to drop the `sqlite_databases` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "sqlite_databases" DROP CONSTRAINT "sqlite_databases_userId_fkey";

-- DropTable
DROP TABLE "sqlite_databases";

-- CreateTable
CREATE TABLE "databases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dbName" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "databases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "databases_dbName_key" ON "databases"("dbName");

-- CreateIndex
CREATE UNIQUE INDEX "databases_roleName_key" ON "databases"("roleName");

-- CreateIndex
CREATE UNIQUE INDEX "databases_userId_name_key" ON "databases"("userId", "name");

-- AddForeignKey
ALTER TABLE "databases" ADD CONSTRAINT "databases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
