#!/usr/bin/env node
/**
 * generate-apple-secret.mjs
 *
 * Generates the Apple Sign In client secret JWT required by NextAuth.
 *
 * Apple's client secret is a JWT signed with an ES256 private key obtained
 * from the Apple Developer portal. The JWT is valid for up to 6 months.
 * After it expires you must regenerate and update APPLE_CLIENT_SECRET.
 *
 * Usage
 * -----
 *   node scripts/generate-apple-secret.mjs
 *
 * The script reads credentials from environment variables. Either export them
 * in your shell or create a .env.apple file (not committed to git) with:
 *
 *   APPLE_TEAM_ID=XXXXXXXXXX          # 10-char Team ID from developer.apple.com
 *   APPLE_KEY_ID=XXXXXXXXXX           # Key ID shown when you created the .p8 key
 *   APPLE_CLIENT_ID=com.example.app   # Services ID you registered for Sign In with Apple
 *   APPLE_PRIVATE_KEY_PATH=./AuthKey_XXXXXXXXXX.p8   # Path to the .p8 file
 *   # OR: provide the key content directly (newlines as \n)
 *   # APPLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
 *
 * Output
 * ------
 * Prints the generated JWT and the exact line to paste into your .env.local:
 *   APPLE_CLIENT_SECRET="eyJhbGci..."
 *
 * Dependencies
 * ------------
 * This script uses only Node.js built-ins (crypto, fs) — no npm install needed.
 * Requires Node.js 18+.
 */

import { createSign } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load env from .env.apple if present ─────────────────────────────────────
try {
  const lines = readFileSync(".env.apple", "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env.apple not found — rely on shell env vars
}

const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const clientId = process.env.APPLE_CLIENT_ID;

if (!teamId || !keyId || !clientId) {
  console.error(
    "❌  Missing required env vars: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID"
  );
  process.exit(1);
}

// Load the private key
let privateKey;
if (process.env.APPLE_PRIVATE_KEY) {
  privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n");
} else if (process.env.APPLE_PRIVATE_KEY_PATH) {
  privateKey = readFileSync(
    resolve(process.env.APPLE_PRIVATE_KEY_PATH),
    "utf-8"
  );
} else {
  console.error(
    "❌  Provide APPLE_PRIVATE_KEY (inline) or APPLE_PRIVATE_KEY_PATH (.p8 file path)"
  );
  process.exit(1);
}

// Build the JWT
const now = Math.floor(Date.now() / 1000);
// Apple allows max 6 months (≈15,777,000 seconds)
const exp = now + 15_552_000; // 180 days

const header = Buffer.from(
  JSON.stringify({ alg: "ES256", kid: keyId })
).toString("base64url");

const payload = Buffer.from(
  JSON.stringify({
    iss: teamId,
    iat: now,
    exp,
    aud: "https://appleid.apple.com",
    sub: clientId,
  })
).toString("base64url");

const signingInput = `${header}.${payload}`;

const sign = createSign("SHA256");
sign.update(signingInput);
const sig = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
const sigBase64 = sig.toString("base64url");

const jwt = `${signingInput}.${sigBase64}`;

const expiresAt = new Date(exp * 1000).toISOString().slice(0, 10);

console.log(`\n✅  Apple client secret JWT generated (expires ${expiresAt})\n`);
console.log("─".repeat(72));
console.log(`APPLE_CLIENT_SECRET="${jwt}"`);
console.log("─".repeat(72));
console.log(
  "\nPaste the line above into your .env.local and restart the dev server.\n"
);
