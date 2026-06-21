-- CreateIndex
CREATE INDEX "ActivityEvent_goalId_createdAt_idx" ON "ActivityEvent"("goalId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_goalId_parentId_idx" ON "Comment"("goalId", "parentId");

-- CreateIndex
CREATE INDEX "ExecutionTask_goalId_status_idx" ON "ExecutionTask"("goalId", "status");

-- CreateIndex
CREATE INDEX "Goal_deletedAt_idx" ON "Goal"("deletedAt");

-- CreateIndex
CREATE INDEX "TaskJob_createdAt_idx" ON "TaskJob"("createdAt");
