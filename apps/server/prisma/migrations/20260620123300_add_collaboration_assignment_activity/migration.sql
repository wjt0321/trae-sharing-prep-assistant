-- AlterTable
ALTER TABLE "ExecutionTask" ADD COLUMN "assigneeId" TEXT;

-- AlterTable
ALTER TABLE "Plan" ADD COLUMN "changeReason" TEXT;

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Assignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "ExecutionTask" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetTitle" TEXT,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityEvent_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parentId" TEXT,
    "anchorType" TEXT,
    "anchorId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'comment',
    "mentions" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("anchorId", "anchorType", "content", "createdAt", "goalId", "id", "parentId", "resolvedAt", "updatedAt", "userId") SELECT "anchorId", "anchorType", "content", "createdAt", "goalId", "id", "parentId", "resolvedAt", "updatedAt", "userId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_goalId_idx" ON "Comment"("goalId");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
CREATE INDEX "Comment_anchorType_anchorId_idx" ON "Comment"("anchorType", "anchorId");
CREATE INDEX "Comment_type_idx" ON "Comment"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Assignment_taskId_idx" ON "Assignment"("taskId");

-- CreateIndex
CREATE INDEX "Assignment_assigneeId_idx" ON "Assignment"("assigneeId");

-- CreateIndex
CREATE INDEX "ActivityEvent_goalId_idx" ON "ActivityEvent"("goalId");

-- CreateIndex
CREATE INDEX "ActivityEvent_type_idx" ON "ActivityEvent"("type");

-- CreateIndex
CREATE INDEX "ActivityEvent_actorId_idx" ON "ActivityEvent"("actorId");

-- CreateIndex
CREATE INDEX "ActivityEvent_targetType_targetId_idx" ON "ActivityEvent"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "ExecutionTask_assigneeId_idx" ON "ExecutionTask"("assigneeId");
