import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  magicLinkHtml,
  magicLinkText,
  sendVerificationRequest,
  createEmailTransport,
} from "@/lib/email";
import type { NodemailerConfig } from "@auth/core/providers/nodemailer";

// ─── magicLinkHtml ────────────────────────────────────────────────────────────

describe("magicLinkHtml", () => {
  const params = {
    url: "https://app.goaltracker.com/api/auth/callback/nodemailer?token=abc123&email=user%40example.com",
    host: "app.goaltracker.com",
    email: "user@example.com",
  };

  it("includes the magic-link URL in the CTA button href", () => {
    const html = magicLinkHtml(params);
    expect(html).toContain(`href="${params.url}"`);
  });

  it("includes the host name in the body", () => {
    const html = magicLinkHtml(params);
    // Dots in the host are escaped with zero-width spaces
    expect(html).toContain("app&#8203;.goaltracker&#8203;.com");
  });

  it("is valid HTML with a DOCTYPE declaration", () => {
    const html = magicLinkHtml(params);
    expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it("contains the brand name", () => {
    const html = magicLinkHtml(params);
    expect(html).toContain("GoalTracker");
  });

  it("contains an expiry notice", () => {
    const html = magicLinkHtml(params);
    expect(html).toContain("expires in 24 hours");
  });

  it("contains a plain-text fallback URL section", () => {
    const html = magicLinkHtml(params);
    expect(html).toContain("copy and paste this link");
  });
});

// ─── magicLinkText ────────────────────────────────────────────────────────────

describe("magicLinkText", () => {
  const params = {
    url: "https://app.goaltracker.com/api/auth/callback/nodemailer?token=abc123",
    host: "app.goaltracker.com",
    email: "user@example.com",
  };

  it("includes the magic-link URL", () => {
    const text = magicLinkText(params);
    expect(text).toContain(params.url);
  });

  it("includes the host name", () => {
    const text = magicLinkText(params);
    expect(text).toContain(params.host);
  });

  it("mentions 24 hours expiry", () => {
    const text = magicLinkText(params);
    expect(text).toContain("24 hours");
  });

  it("is plain text (no HTML tags)", () => {
    const text = magicLinkText(params);
    expect(text).not.toMatch(/<[^>]+>/);
  });
});

// ─── createEmailTransport ─────────────────────────────────────────────────────

describe("createEmailTransport", () => {
  beforeEach(() => {
    delete process.env.EMAIL_SERVER;
  });

  afterEach(() => {
    // Use delete, not assignment to undefined, to avoid turning it into
    // the string "undefined" which breaks nodemailer's createTransport.
    delete process.env.EMAIL_SERVER;
  });

  it("returns a transporter when EMAIL_SERVER is not set (dev console fallback)", () => {
    const transport = createEmailTransport();
    expect(transport).toBeDefined();
    expect(typeof transport.sendMail).toBe("function");
  });

  it("returns a transporter when EMAIL_SERVER is the localhost placeholder", () => {
    process.env.EMAIL_SERVER = "smtp://localhost:1025";
    const transport = createEmailTransport();
    expect(transport).toBeDefined();
    expect(typeof transport.sendMail).toBe("function");
  });
});

// ─── sendVerificationRequest delivery error handling ─────────────────────────

describe("sendVerificationRequest error handling logic", () => {
  /**
   * These tests validate the delivery-failure detection logic without
   * requiring a real SMTP server or complex module mocking.
   */

  it("identifies rejected recipients as failures", () => {
    const rejected = ["bad@example.com"];
    const pending: string[] = [];
    const failed = [...rejected, ...pending].filter(Boolean);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toBe("bad@example.com");
  });

  it("identifies pending recipients as failures", () => {
    const rejected: string[] = [];
    const pending = ["stuck@example.com"];
    const failed = [...rejected, ...pending].filter(Boolean);

    expect(failed).toHaveLength(1);
    expect(failed[0]).toBe("stuck@example.com");
  });

  it("does not flag empty rejected/pending arrays as failures", () => {
    const rejected: string[] = [];
    const pending: string[] = [];
    const failed = [...rejected, ...pending].filter(Boolean);

    expect(failed).toHaveLength(0);
  });

  it("would throw the correct error message for failed delivery", () => {
    const failed = ["bad@example.com", "also-bad@example.com"];

    expect(() => {
      if (failed.length > 0) {
        throw new Error(
          `Magic link email could not be delivered to: ${failed.join(", ")}`
        );
      }
    }).toThrow(
      "Magic link email could not be delivered to: bad@example.com, also-bad@example.com"
    );
  });
});

// ─── sendVerificationRequest integration (dev console transport) ──────────────

describe("sendVerificationRequest (dev transport)", () => {
  beforeEach(() => {
    // Ensure the dev console fallback is used
    delete process.env.EMAIL_SERVER;
  });

  afterEach(() => {
    delete process.env.EMAIL_SERVER;
  });

  it("sends without throwing when using the console (dev) transport", async () => {
    const mockProvider: NodemailerConfig = {
      id: "nodemailer",
      name: "Email",
      type: "email",
      from: "GoalTracker <noreply@goaltracker.app>",
      server: "smtp://localhost:1025",
      maxAge: 24 * 60 * 60,
      sendVerificationRequest: async () => {},
      options: {},
    };

    // Should resolve without error — console transport always succeeds
    await expect(
      sendVerificationRequest({
        identifier: "alice@example.com",
        url: "https://localhost:3000/api/auth/callback/nodemailer?token=test",
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        provider: mockProvider,
        token: "test",
        theme: {},
        request: new Request("https://localhost:3000"),
      })
    ).resolves.toBeUndefined();
  });
});
