-- AlterTable
ALTER TABLE "ActivityEvent" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "ExecutionTask" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "TaskStatusHistory" ADD COLUMN "deletedAt" DATETIME;

-- CreateIndex
CREATE INDEX "ExecutionTask_deletedAt_idx" ON "ExecutionTask"("deletedAt");
