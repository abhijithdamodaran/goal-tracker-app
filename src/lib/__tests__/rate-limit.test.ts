import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const testEmail = "test-rate-limit@example.com";
  const opts = { maxRequests: 3, windowMs: 15 * 60 * 1000 };

  beforeEach(() => {
    resetRateLimit(testEmail);
  });

  it("allows the first request", () => {
    const result = checkRateLimit(testEmail, opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("allows up to maxRequests requests within the window", () => {
    const r1 = checkRateLimit(testEmail, opts);
    expect(r1.allowed).toBe(true);

    const r2 = checkRateLimit(testEmail, opts);
    expect(r2.allowed).toBe(true);

    const r3 = checkRateLimit(testEmail, opts);
    expect(r3.allowed).toBe(true);
  });

  it("blocks the (maxRequests + 1)th request", () => {
    checkRateLimit(testEmail, opts);
    checkRateLimit(testEmail, opts);
    checkRateLimit(testEmail, opts);

    const blocked = checkRateLimit(testEmail, opts);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("normalises the identifier to lowercase", () => {
    checkRateLimit("Test@Example.COM", opts);
    checkRateLimit("TEST@EXAMPLE.COM", opts);
    checkRateLimit("test@example.com", opts);

    // All three requests should be counted against the same bucket
    const blocked = checkRateLimit("Test@Example.COM", opts);
    expect(blocked.allowed).toBe(false);
  });

  it("resets the counter after resetRateLimit", () => {
    checkRateLimit(testEmail, opts);
    checkRateLimit(testEmail, opts);
    checkRateLimit(testEmail, opts);

    resetRateLimit(testEmail);

    const result = checkRateLimit(testEmail, opts);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("uses default limits when no options are provided", () => {
    const defaultEmail = "default-limit@example.com";
    resetRateLimit(defaultEmail);

    const r = checkRateLimit(defaultEmail);
    expect(r.allowed).toBe(true);
    // Default is 3 requests, so after 1 we have 2 remaining
    expect(r.remaining).toBe(2);
  });

  it("returns a resetAt timestamp in the future", () => {
    const before = Date.now();
    const result = checkRateLimit(testEmail, opts);
    expect(result.resetAt).toBeGreaterThan(before);
  });
});
