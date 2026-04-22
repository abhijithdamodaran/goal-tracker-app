import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Welcome to GoalTracker — Get Started",
  description: "Set up your GoalTracker account in a few simple steps.",
};

/**
 * Onboarding layout.
 *
 * Server-side guard: if somehow an already-onboarded user reaches this layout
 * (e.g., direct URL navigation that bypassed middleware), redirect them to the
 * dashboard. The middleware also performs this check, but the server component
 * guard provides defence in depth.
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Not authenticated at all → middleware will handle it, but guard here too
  if (!session?.user) {
    redirect("/signin");
  }

  // Already finished onboarding → no need to see this flow again
  if (session.user.onboardingCompleted) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Minimal header — no navigation links, just the brand */}
      <header className="flex items-center justify-center py-6 px-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">
            GoalTracker
          </span>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
