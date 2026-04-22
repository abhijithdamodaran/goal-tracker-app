/**
 * Simple in-memory rate limiter for magic link email requests.
 *
 * Uses a sliding-window counter keyed by identifier (email or IP).
 * This is intentionally simple — for production at scale, replace
 * with a Redis-backed limiter (e.g. Upstash Rate Limit).
 *
 * Defaults: max 3 requests per 15 minutes per identifier.
 */

interface RateLimitEntry {
  count: number;
  firstRequestAt: number;
}

interface RateLimitOptions {
  /** Maximum requests allowed within the window. */
  maxRequests?: number;
  /** Window duration in milliseconds. */
  windowMs?: number;
}

interface RateLimitResult {
  allowed: boolean;
  /** Remaining requests in the current window. */
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds until the rate limit resets (for Retry-After header). */
  retryAfterSeconds: number;
}

/**
 * In-memory store. Survives only as long as the Node.js process lives —
 * acceptable for the single-server MVP, where rate-limiting on restart is
 * an acceptable trade-off.
 */
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent unbounded growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.firstRequestAt > CLEANUP_INTERVAL_MS) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

/**
 * Check whether an identifier is within the rate limit.
 *
 * @param identifier - Email address or IP to rate-limit.
 * @param options    - Override defaults (maxRequests / windowMs).
 * @returns RateLimitResult with `allowed` flag and metadata.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const maxRequests = options.maxRequests ?? 3;
  const windowMs = options.windowMs ?? 15 * 60 * 1000; // 15 minutes

  const now = Date.now();
  const normalised = identifier.toLowerCase().trim();
  const existing = store.get(normalised);

  if (!existing || now - existing.firstRequestAt > windowMs) {
    // First request in a new window
    store.set(normalised, { count: 1, firstRequestAt: now });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
      retryAfterSeconds: 0,
    };
  }

  if (existing.count >= maxRequests) {
    const resetAt = existing.firstRequestAt + windowMs;
    const retryAfterSeconds = Math.ceil((resetAt - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterSeconds,
    };
  }

  existing.count += 1;
  store.set(normalised, existing);
  const resetAt = existing.firstRequestAt + windowMs;
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt,
    retryAfterSeconds: 0,
  };
}

/**
 * Reset the rate limit counter for an identifier (useful in tests).
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier.toLowerCase().trim());
}
