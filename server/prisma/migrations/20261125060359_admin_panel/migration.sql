-- CreateEnum
CREATE TYPE "BillingEventType" AS ENUM ('CREATED', 'RENEWED', 'PAYMENT_FAILED', 'CANCELLED', 'EXPIRED', 'REACTIVATED');

-- AlterTable
ALTER TABLE "deployments" ADD COLUMN     "startedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "providerSubscriptionId" TEXT NOT NULL,
    "type" "BillingEventType" NOT NULL,
    "paymentId" TEXT,
    "amountCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_samples" (
    "id" TEXT NOT NULL,
    "cpuPercent" DOUBLE PRECISION NOT NULL,
    "load1" DOUBLE PRECISION NOT NULL,
    "memUsed" BIGINT NOT NULL,
    "memTotal" BIGINT NOT NULL,
    "diskUsed" BIGINT NOT NULL,
    "diskTotal" BIGINT NOT NULL,
    "containersRunning" INTEGER NOT NULL,
    "appsRunning" INTEGER NOT NULL,
    "buildsQueued" INTEGER NOT NULL,
    "buildsRunning" INTEGER NOT NULL,
    "dbBytes" BIGINT NOT NULL,
    "storageBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_metric_samples" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "memoryBytes" BIGINT NOT NULL,
    "cpuPercent" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_metric_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_paymentId_key" ON "billing_events"("paymentId");

-- CreateIndex
CREATE INDEX "billing_events_createdAt_idx" ON "billing_events"("createdAt");

-- CreateIndex
CREATE INDEX "billing_events_userId_idx" ON "billing_events"("userId");

-- CreateIndex
CREATE INDEX "metric_samples_createdAt_idx" ON "metric_samples"("createdAt");

-- CreateIndex
CREATE INDEX "app_metric_samples_appId_createdAt_idx" ON "app_metric_samples"("appId", "createdAt");

-- CreateIndex
CREATE INDEX "app_metric_samples_createdAt_idx" ON "app_metric_samples"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_createdAt_idx" ON "admin_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "admin_audit_logs_targetId_idx" ON "admin_audit_logs"("targetId");

-- CreateIndex
CREATE INDEX "admin_audit_logs_action_idx" ON "admin_audit_logs"("action");

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_metric_samples" ADD CONSTRAINT "app_metric_samples_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
