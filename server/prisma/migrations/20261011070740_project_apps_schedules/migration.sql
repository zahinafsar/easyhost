-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "appEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "appName" TEXT,
ADD COLUMN     "deleting" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentProjectId" TEXT;

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "headers" JSONB NOT NULL DEFAULT '{}',
    "body" TEXT,
    "intervalMinutes" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lockedUntil" TIMESTAMP(3),
    "lockToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedule_runs" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "statusCode" INTEGER,
    "error" TEXT,
    "durationMs" INTEGER NOT NULL,

    CONSTRAINT "schedule_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedules_enabled_nextRunAt_idx" ON "schedules"("enabled", "nextRunAt");

-- CreateIndex
CREATE INDEX "schedules_projectId_idx" ON "schedules"("projectId");

-- CreateIndex
CREATE INDEX "schedule_runs_scheduleId_startedAt_idx" ON "schedule_runs"("scheduleId", "startedAt");

-- CreateIndex
CREATE INDEX "apps_parentProjectId_idx" ON "apps"("parentProjectId");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_parentProjectId_fkey" FOREIGN KEY ("parentProjectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_runs" ADD CONSTRAINT "schedule_runs_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
