-- CreateEnum
CREATE TYPE "TokenPurchaseStatus" AS ENUM ('PENDING', 'PAID');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "freeAiAppUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "freeAiBuildUsed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tokenBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "token_purchases" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "TokenPurchaseStatus" NOT NULL DEFAULT 'PENDING',
    "lsCheckoutId" TEXT,
    "lsOrderId" TEXT,
    "lsEventId" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_usages" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT,
    "appName" TEXT NOT NULL,
    "free" BOOLEAN NOT NULL DEFAULT false,
    "tokens" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedInputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "token_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_lsCheckoutId_key" ON "token_purchases"("lsCheckoutId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_lsOrderId_key" ON "token_purchases"("lsOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "token_purchases_lsEventId_key" ON "token_purchases"("lsEventId");

-- CreateIndex
CREATE INDEX "token_purchases_userId_status_createdAt_idx" ON "token_purchases"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "token_usages_userId_createdAt_idx" ON "token_usages"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "token_purchases" ADD CONSTRAINT "token_purchases_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_usages" ADD CONSTRAINT "token_usages_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
