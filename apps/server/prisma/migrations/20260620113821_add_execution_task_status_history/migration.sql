-- AlterTable
ALTER TABLE "ExecutionTask" ADD COLUMN "blockerNote" TEXT;
ALTER TABLE "ExecutionTask" ADD COLUMN "stageName" TEXT;

-- CreateTable
CREATE TABLE "TaskStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "blockerNote" TEXT,
    "operatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskStatusHistory_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ExecutionTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "TaskStatusHistory_taskId_idx" ON "TaskStatusHistory"("taskId");

-- CreateIndex
CREATE INDEX "TaskStatusHistory_operatorId_idx" ON "TaskStatusHistory"("operatorId");

-- CreateIndex
CREATE INDEX "ExecutionTask_stageId_idx" ON "ExecutionTask"("stageId");
