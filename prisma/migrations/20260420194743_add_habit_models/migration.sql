-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "streakMode" TEXT NOT NULL DEFAULT 'strict',
    "percentageThreshold" REAL NOT NULL DEFAULT 0.8,
    "scheduledDays" TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "streakCount" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "graceUsedWeek" TEXT,
    "currentStreakStartDate" TEXT,
    "lastCompletedDate" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HabitCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "recordedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "syncStatus" TEXT NOT NULL DEFAULT 'synced',
    "habitId" TEXT NOT NULL,
    CONSTRAINT "HabitCheckIn_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitCheckIn_habitId_date_key" ON "HabitCheckIn"("habitId", "date");
