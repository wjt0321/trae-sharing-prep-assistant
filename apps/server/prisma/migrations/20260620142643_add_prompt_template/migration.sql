-- CreateTable
CREATE TABLE "PromptTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "userTemplate" TEXT NOT NULL,
    "variablesJson" TEXT NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "PromptTemplate_name_idx" ON "PromptTemplate"("name");

-- CreateIndex
CREATE INDEX "PromptTemplate_isActive_idx" ON "PromptTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PromptTemplate_name_version_key" ON "PromptTemplate"("name", "version");
