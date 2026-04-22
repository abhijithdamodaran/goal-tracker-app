"use server";

/**
 * Server actions for authentication flows.
 *
 * `resendMagicLink` — lets users request a new magic link from the
 * verify-request page without navigating back to sign-in.
 */

import { z } from "zod";
import { signIn } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const emailSchema = z.string().email("Please enter a valid email address");

export interface ResendMagicLinkResult {
  success: boolean;
  error?: string;
  /** Seconds until the rate limit resets (only present when rate-limited). */
  retryAfterSeconds?: number;
}

/**
 * Resend a magic link to the given email address.
 *
 * Rate limited: max 3 requests per email per 15 minutes.
 * Returns a serialisable result (no throws that reach the client).
 */
export async function resendMagicLink(
  email: string
): Promise<ResendMagicLinkResult> {
  // 1. Validate email format
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) {
    return { success: false, error: "Please enter a valid email address." };
  }
  const normalisedEmail = parsed.data.toLowerCase().trim();

  // 2. Check rate limit keyed by email
  const limit = checkRateLimit(normalisedEmail, {
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
  });

  if (!limit.allowed) {
    return {
      success: false,
      error: `Too many requests. Please wait ${limit.retryAfterSeconds} seconds before trying again.`,
      retryAfterSeconds: limit.retryAfterSeconds,
    };
  }

  // 3. Get origin for callbackUrl
  let origin = "http://localhost:3000";
  try {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") ?? "http";
    if (host) origin = `${protocol}://${host}`;
  } catch {
    // headers() throws outside of a request context (e.g. tests)
  }

  // 4. Trigger magic link via NextAuth Nodemailer provider
  try {
    await signIn("nodemailer", {
      email: normalisedEmail,
      redirectTo: `${origin}/`,
      redirect: false,
    });
    return { success: true };
  } catch (err) {
    // signIn may throw a NEXT_REDIRECT for certain error paths; surface it
    if (
      err instanceof Error &&
      err.message?.includes("NEXT_REDIRECT")
    ) {
      // This is actually a successful sign-in redirect — treat as success
      return { success: true };
    }
    console.error("[resendMagicLink] signIn error:", err);
    return {
      success: false,
      error: "Could not send magic link. Please try again.",
    };
  }
}
