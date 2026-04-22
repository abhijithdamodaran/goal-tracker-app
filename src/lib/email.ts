/**
 * Email transport configuration for GoalTracker.
 *
 * In development (or when EMAIL_SERVER is not configured):
 *   - Falls back to a console-based transport that prints the magic link to stdout.
 *   - This means no SMTP server is required for local development.
 *
 * In production:
 *   - Uses the SMTP server specified in EMAIL_SERVER env var.
 *   - Example: "smtp://user:pass@smtp.sendgrid.net:587"
 */

import nodemailer, { type Transport, type Transporter } from "nodemailer";
import type MailMessage from "nodemailer/lib/mailer/mail-message";
import type { NodemailerConfig } from "@auth/core/providers/nodemailer";

const { createTransport } = nodemailer;

// ─── Dev console transport ────────────────────────────────────────────────────

interface MailInfo {
  envelope: { from: string; to: string[] };
  messageId: string;
}

type SendCallback = (err: Error | null, info: MailInfo) => void;

/**
 * A minimal nodemailer-compatible transport that prints emails to the console.
 * Used in development when no SMTP server is configured.
 */
const consoleTransport: Transport<MailInfo> = {
  name: "console",
  version: "1.0.0",
  send(mail: MailMessage<MailInfo>, callback: SendCallback) {
    const envelope = mail.message.getEnvelope() as {
      from: string;
      to: string[];
    };
    const messageId = mail.message.messageId() as string;

    const chunks: Buffer[] = [];
    const stream = mail.message.createReadStream();

    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");

      // Extract the magic link URL from the email body for convenience.
      const urlMatch = body.match(
        /href="([^"]*\/api\/auth\/callback\/nodemailer[^"]*)"/
      );
      const magicUrl = urlMatch
        ? urlMatch[1]
        : "(URL not found — check full body)";

      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║              MAGIC LINK (dev console)               ║");
      console.log("╠══════════════════════════════════════════════════════╣");
      console.log(`║  To:      ${envelope.to.join(", ")}`);
      console.log(`║  MsgId:   ${messageId}`);
      console.log("║");
      console.log("║  Click this link to sign in:");
      console.log(`║  ${magicUrl}`);
      console.log("╚══════════════════════════════════════════════════════╝\n");

      callback(null, { envelope, messageId });
    });

    stream.on("error", (err: Error) =>
      callback(err, { envelope: { from: "", to: [] }, messageId: "" })
    );
  },
};

// ─── Transport factory ────────────────────────────────────────────────────────

/**
 * Create a nodemailer transporter.
 *
 * Resolution order:
 *  1. If EMAIL_SERVER is set AND not the localhost placeholder → SMTP
 *  2. Otherwise → console transport (dev-friendly)
 */
export function createEmailTransport(): Transporter {
  const server = process.env.EMAIL_SERVER;
  const isDevFallback =
    !server ||
    server === "smtp://localhost:1025" ||
    server.includes("localhost");

  if (isDevFallback) {
    // Use console transport in development
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return createTransport(consoleTransport as any);
  }

  return createTransport(server);
}

// ─── Branded email templates ──────────────────────────────────────────────────

interface MagicLinkEmailParams {
  url: string;
  host: string;
  email: string;
}

/**
 * HTML body for the magic link email.
 * Branded for GoalTracker with a clean, family-friendly design.
 */
export function magicLinkHtml({ url, host }: MagicLinkEmailParams): string {
  const escapedHost = host.replace(/\./g, "&#8203;.");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in to GoalTracker</title>
  <style>
    body {
      background-color: #f9fafb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 40px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      max-width: 480px;
      margin: 0 auto;
    }
    .logo-wrap {
      text-align: center;
      margin-bottom: 24px;
    }
    .logo-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 56px;
      height: 56px;
      background: #2563eb;
      border-radius: 16px;
    }
    .brand-name {
      margin: 8px 0 0;
      font-size: 22px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.3px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 32px;
      text-align: center;
    }
    .headline {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 8px;
    }
    .subtext {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 28px;
      line-height: 1.6;
    }
    .cta-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: 0.1px;
    }
    .cta-btn:hover {
      background: #1d4ed8;
    }
    .url-fallback {
      margin-top: 24px;
      font-size: 12px;
      color: #9ca3af;
      word-break: break-all;
      line-height: 1.6;
    }
    .url-fallback a {
      color: #6b7280;
    }
    .expiry-note {
      margin-top: 20px;
      font-size: 12px;
      color: #d1d5db;
    }
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #d1d5db;
      line-height: 1.6;
    }
    .footer a {
      color: #9ca3af;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Logo -->
    <div class="logo-wrap">
      <div class="logo-icon">
        <!-- Bar chart icon (inline SVG) -->
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24"
             stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75
                   C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z"/>
          <path d="M9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25
                   c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625z"/>
          <path d="M16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75
                   c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/>
        </svg>
      </div>
      <p class="brand-name">GoalTracker</p>
    </div>

    <!-- Card -->
    <div class="card">
      <h1 class="headline">Your sign-in link 🔑</h1>
      <p class="subtext">
        Click the button below to sign in to
        <strong>${escapedHost}</strong>.<br />
        No password required — just click and you&rsquo;re in.
      </p>

      <a href="${url}" class="cta-btn" target="_blank" rel="noopener noreferrer">
        Sign in to GoalTracker
      </a>

      <p class="url-fallback">
        If the button doesn&rsquo;t work, copy and paste this link into your browser:<br />
        <a href="${url}">${url}</a>
      </p>

      <p class="expiry-note">This link expires in 24 hours and can only be used once.</p>
    </div>

    <!-- Footer -->
    <p class="footer">
      You&rsquo;re receiving this because you requested a sign-in link for
      GoalTracker. If you didn&rsquo;t request this, you can safely ignore it.<br /><br />
      &copy; ${new Date().getFullYear()} GoalTracker
    </p>
  </div>
</body>
</html>`;
}

/**
 * Plain-text fallback for the magic link email.
 */
export function magicLinkText({ url, host }: MagicLinkEmailParams): string {
  return [
    `Sign in to ${host}`,
    "",
    "Click the link below to sign in — no password required:",
    url,
    "",
    "This link expires in 24 hours and can only be used once.",
    "",
    "If you didn't request this, you can safely ignore this email.",
  ].join("\n");
}

// ─── sendVerificationRequest ──────────────────────────────────────────────────

/**
 * Subset of NextAuth NodemailerConfig parameters passed to sendVerificationRequest.
 * We accept the full NodemailerConfig so our function matches the expected signature.
 */
export interface SendVerificationRequestParams {
  identifier: string;
  url: string;
  expires: Date;
  provider: NodemailerConfig;
  token: string;
  theme: { brandColor?: string; buttonText?: string; colorScheme?: string; logo?: string };
  request: Request;
}

/**
 * Custom sendVerificationRequest for the NextAuth Nodemailer provider.
 *
 * Drop this into the Nodemailer provider config as:
 *   Nodemailer({ server, from, sendVerificationRequest })
 */
export async function sendVerificationRequest({
  identifier,
  url,
  provider,
}: SendVerificationRequestParams): Promise<void> {
  const { host } = new URL(url);
  const transport = createEmailTransport();

  const emailParams: MagicLinkEmailParams = { url, host, email: identifier };

  const from =
    provider.from ??
    process.env.EMAIL_FROM ??
    "GoalTracker <noreply@goaltracker.app>";

  const result = await transport.sendMail({
    to: identifier,
    from,
    subject: `Sign in to GoalTracker`,
    html: magicLinkHtml(emailParams),
    text: magicLinkText(emailParams),
  });

  // Check for delivery failures
  const rejected = (result.rejected ?? []) as string[];
  const pending = (result.pending ?? []) as string[];
  const failed = [...rejected, ...pending].filter(Boolean);

  if (failed.length > 0) {
    throw new Error(
      `Magic link email could not be delivered to: ${failed.join(", ")}`
    );
  }
}
