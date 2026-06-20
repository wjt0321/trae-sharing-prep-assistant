-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "title" TEXT,
    "scenarioType" TEXT,
    "audience" TEXT,
    "duration" INTEGER,
    "shareDate" DATETIME,
    "goalType" TEXT,
    "preparedness" TEXT,
    "timeConstraint" TEXT,
    "resourceConstraint" TEXT,
    "priority" TEXT,
    "successCriteria" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'inspiration',
    "isCollaborative" BOOLEAN NOT NULL DEFAULT false,
    "sceneTags" TEXT,
    "scenarioSnapshot" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "Goal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Goal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("audience", "createdAt", "creatorId", "deletedAt", "duration", "goalType", "id", "preparedness", "sceneTags", "shareDate", "topic", "updatedAt", "workspaceId") SELECT "audience", "createdAt", "creatorId", "deletedAt", "duration", "goalType", "id", "preparedness", "sceneTags", "shareDate", "topic", "updatedAt", "workspaceId" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE INDEX "Goal_workspaceId_idx" ON "Goal"("workspaceId");
CREATE INDEX "Goal_creatorId_idx" ON "Goal"("creatorId");
CREATE INDEX "Goal_scenarioType_idx" ON "Goal"("scenarioType");
CREATE INDEX "Goal_currentStage_idx" ON "Goal"("currentStage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
