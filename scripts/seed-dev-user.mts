/**
 * Seeds a dev test user: john@example.com / password: password123
 * Run with: npx tsx --tsconfig tsconfig.json scripts/seed-dev-user.mts
 */
import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({ adapter } as never);

const email = "john@example.com";
const plainPassword = "password123";
const hashed = await bcrypt.hash(plainPassword, 10);

const user = await (prisma as unknown as { user: { upsert: (args: unknown) => Promise<{ email: string; id: string }> } }).user.upsert({
  where: { email },
  update: { password: hashed, name: "John" },
  create: { email, name: "John", password: hashed, onboardingCompleted: true },
});

console.log(`✅ Dev user ready:`);
console.log(`   Email:    ${user.email}`);
console.log(`   Password: ${plainPassword}`);
console.log(`   ID:       ${user.id}`);

await (prisma as unknown as { $disconnect: () => Promise<void> }).$disconnect();
