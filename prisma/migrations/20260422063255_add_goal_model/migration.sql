-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metric" TEXT,
    "targetValue" REAL,
    "unit" TEXT,
    "reflection" TEXT,
    "deadline" DATETIME,
    "smartScore" INTEGER NOT NULL DEFAULT 0,
    "workspaceType" TEXT NOT NULL DEFAULT 'personal',
    "workspaceId" TEXT,
    "ownerId" TEXT NOT NULL,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Goal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
