/**
 * Seeds dev test user: john@example.com / password: password123
 * Run with: node scripts/seed-dev-user.mjs
 */
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../dev.db");
const db = new Database(dbPath);

const email = "john@example.com";
const plainPassword = "password123";
const hashed = bcrypt.hashSync(plainPassword, 10);

const existing = db.prepare("SELECT id FROM User WHERE email = ?").get(email);

if (existing) {
  db.prepare("UPDATE User SET password = ?, name = ?, onboardingCompleted = 1 WHERE email = ?")
    .run(hashed, "John", email);
  console.log(`✅ Updated existing user: ${email}`);
} else {
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO User (id, email, name, password, onboardingCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, 1, ?, ?)"
  ).run(id, email, "John", hashed, now, now);
  console.log(`✅ Created new user: ${email}`);
}

console.log(`   Email:    ${email}`);
console.log(`   Password: ${plainPassword}`);
db.close();
