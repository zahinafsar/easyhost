-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "app_domains" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "hostname" TEXT NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "npmProxyHostId" INTEGER,
    "npmCertificateId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_domains_hostname_key" ON "app_domains"("hostname");

-- CreateIndex
CREATE INDEX "app_domains_appId_idx" ON "app_domains"("appId");

-- AddForeignKey
ALTER TABLE "app_domains" ADD CONSTRAINT "app_domains_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
