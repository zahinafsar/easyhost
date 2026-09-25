-- CreateEnum
CREATE TYPE "DeploymentStep" AS ENUM ('QUEUED', 'PREPARING', 'INSTALLING', 'BUILDING', 'STARTING', 'ROUTING', 'DONE');

-- AlterTable
ALTER TABLE "deployments" ADD COLUMN     "step" "DeploymentStep" NOT NULL DEFAULT 'QUEUED';
