-- AlterTable
ALTER TABLE "ai_messages" ADD COLUMN     "steps" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "aiSteps" JSONB NOT NULL DEFAULT '[]';
