/*
  Warnings:

  - You are about to drop the `schedule_runs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `schedules` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "schedule_runs" DROP CONSTRAINT "schedule_runs_scheduleId_fkey";

-- DropForeignKey
ALTER TABLE "schedules" DROP CONSTRAINT "schedules_projectId_fkey";

-- DropTable
DROP TABLE "schedule_runs";

-- DropTable
DROP TABLE "schedules";
