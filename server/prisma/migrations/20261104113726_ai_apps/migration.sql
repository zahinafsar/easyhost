-- CreateEnum
CREATE TYPE "AppKind" AS ENUM ('NODE', 'AI');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('IDLE', 'GENERATING', 'FAILED');

-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "aiAuthSecret" TEXT,
ADD COLUMN     "aiError" TEXT,
ADD COLUMN     "aiProgress" TEXT,
ADD COLUMN     "aiStatus" "AiStatus" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "kind" "AppKind" NOT NULL DEFAULT 'NODE';

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_messages_appId_createdAt_idx" ON "ai_messages"("appId", "createdAt");

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
