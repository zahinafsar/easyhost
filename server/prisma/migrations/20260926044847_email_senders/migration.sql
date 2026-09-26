-- CreateTable
CREATE TABLE "email_senders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_senders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_senders_username_key" ON "email_senders"("username");

-- CreateIndex
CREATE INDEX "email_senders_userId_idx" ON "email_senders"("userId");

-- AddForeignKey
ALTER TABLE "email_senders" ADD CONSTRAINT "email_senders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
