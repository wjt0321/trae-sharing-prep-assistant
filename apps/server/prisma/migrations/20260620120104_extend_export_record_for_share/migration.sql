/*
  Warnings:

  - Added the required column `content` to the `ExportRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `ExportRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `ExportRecord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `ExportRecord` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ExportRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "filePath" TEXT,
    "shareToken" TEXT,
    "shareExpiresAt" DATETIME,
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'succeeded',
    "errorMessage" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExportRecord_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExportRecord_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExportRecord" ("createdAt", "errorMessage", "filePath", "format", "goalId", "id", "shareToken", "status", "updatedAt") SELECT "createdAt", "errorMessage", "filePath", "format", "goalId", "id", "shareToken", "status", "updatedAt" FROM "ExportRecord";
DROP TABLE "ExportRecord";
ALTER TABLE "new_ExportRecord" RENAME TO "ExportRecord";
CREATE UNIQUE INDEX "ExportRecord_shareToken_key" ON "ExportRecord"("shareToken");
CREATE INDEX "ExportRecord_goalId_idx" ON "ExportRecord"("goalId");
CREATE INDEX "ExportRecord_shareToken_idx" ON "ExportRecord"("shareToken");
CREATE INDEX "ExportRecord_creatorId_idx" ON "ExportRecord"("creatorId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
