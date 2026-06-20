-- AlterTable
ALTER TABLE "KnowledgeAsset" ADD COLUMN "creatorId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'personal',
    "scenarioType" TEXT,
    "content" TEXT NOT NULL,
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Template_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Template" ("category", "content", "createdAt", "createdBy", "description", "id", "isBuiltIn", "name", "updatedAt", "usageCount", "workspaceId") SELECT "category", "content", "createdAt", "createdBy", "description", "id", "isBuiltIn", "name", "updatedAt", "usageCount", "workspaceId" FROM "Template";
DROP TABLE "Template";
ALTER TABLE "new_Template" RENAME TO "Template";
CREATE INDEX "Template_workspaceId_idx" ON "Template"("workspaceId");
CREATE INDEX "Template_category_idx" ON "Template"("category");
CREATE INDEX "Template_scenarioType_idx" ON "Template"("scenarioType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "KnowledgeAsset_creatorId_idx" ON "KnowledgeAsset"("creatorId");
