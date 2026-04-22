import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "node:path";

/**
 * Singleton Prisma Client for the application.
 *
 * Prisma v7 requires an explicit driver adapter. We use better-sqlite3
 * for local SQLite in development and production (web-first MVP).
 *
 * The adapter is wrapped in a singleton to prevent creating a new
 * connection for every module evaluation in dev HMR cycles.
 */

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  // Strip the "file:" prefix to get the file path
  const filePath = dbUrl.startsWith("file:")
    ? dbUrl.slice("file:".length)
    : dbUrl;

  // Resolve relative paths from the project root (process.cwd())
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);

  const adapter = new PrismaBetterSqlite3({ url: resolvedPath });

  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
