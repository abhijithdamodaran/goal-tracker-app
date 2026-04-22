"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { resendMagicLink } from "@/lib/actions/auth";

// ─── Email masker ─────────────────────────────────────────────────────────────

/**
 * Partially redact an email address for display.
 * e.g. "jane@example.com" → "ja**@example.com"
 */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local}@${domain}`;
  const visible = local.slice(0, 2);
  const masked = "*".repeat(Math.min(local.length - 2, 4));
  return `${visible}${masked}@${domain}`;
}

// ─── Main content ─────────────────────────────────────────────────────────────

function VerifyRequestContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error" | "ratelimited"
  >("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [retryAfter, setRetryAfter] = useState<number>(0);

  async function handleResend() {
    if (!email || status === "sending") return;
    setStatus("sending");
    setErrorMsg("");

    const result = await resendMagicLink(email);

    if (result.success) {
      setStatus("sent");
    } else if (result.retryAfterSeconds) {
      setStatus("ratelimited");
      setRetryAfter(result.retryAfterSeconds);
      setErrorMsg(result.error ?? "Too many requests. Please wait before trying again.");
    } else {
      setStatus("error");
      setErrorMsg(result.error ?? "Failed to send magic link. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
          {email ? (
            <p className="text-sm text-gray-600">
              We sent a sign-in link to{" "}
              <strong className="font-semibold text-gray-900">
                {maskEmail(email)}
              </strong>
              . Click it to continue — no password needed.
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              A sign-in link has been sent to your email address. Click the
              link to continue.
            </p>
          )}
        </div>

        {/* Card */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          {/* Steps */}
          <ol className="space-y-3 text-sm text-gray-600">
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                1
              </span>
              Open the email from <strong className="ml-1">GoalTracker</strong>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                2
              </span>
              Click the{" "}
              <strong className="mx-1">&ldquo;Sign in to GoalTracker&rdquo;</strong>{" "}
              button
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                3
              </span>
              You&apos;ll be signed in automatically
            </li>
          </ol>

          <hr className="border-gray-100" />

          <p className="text-xs text-gray-400">
            The link expires in 24 hours and can only be used once.
          </p>
        </div>

        {/* Resend section */}
        {email && (
          <div className="text-center space-y-2">
            {status === "sent" ? (
              <p className="text-sm text-green-700 font-medium">
                ✓ A new link has been sent!
              </p>
            ) : status === "error" || status === "ratelimited" ? (
              <p className="text-sm text-red-600">{errorMsg}</p>
            ) : null}

            {status !== "sent" && (
              <p className="text-sm text-gray-500">
                Didn&apos;t receive the email?{" "}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={status === "sending" || status === "ratelimited"}
                  className="font-medium text-blue-600 underline hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {status === "sending" ? "Sending…" : status === "ratelimited" ? `Retry in ${retryAfter}s` : "Resend magic link"}
                </button>
              </p>
            )}
          </div>
        )}

        {/* Fallback help text when no email param */}
        {!email && (
          <p className="text-center text-xs text-gray-400">
            Didn&apos;t receive an email? Check your spam folder, or{" "}
            <a href="/signin" className="underline hover:text-gray-600">
              try again
            </a>
            .
          </p>
        )}

        {/* Back to sign in */}
        <p className="text-center text-xs text-gray-400">
          Wrong email?{" "}
          <a
            href="/signin"
            className="font-medium text-gray-600 underline hover:text-gray-900"
          >
            Use a different address
          </a>
        </p>
      </div>
    </div>
  );
}

// ─── Page export with Suspense boundary for useSearchParams ──────────────────

export default function VerifyRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <VerifyRequestContent />
    </Suspense>
  );
}
