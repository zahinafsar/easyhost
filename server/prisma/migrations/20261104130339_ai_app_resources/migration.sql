-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "aiBucketId" TEXT,
ADD COLUMN     "aiDatabaseId" TEXT;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_aiDatabaseId_fkey" FOREIGN KEY ("aiDatabaseId") REFERENCES "databases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_aiBucketId_fkey" FOREIGN KEY ("aiBucketId") REFERENCES "buckets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
