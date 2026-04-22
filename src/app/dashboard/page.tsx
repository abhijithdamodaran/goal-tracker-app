import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Dashboard — the main authenticated home screen for returning users.
 *
 * Placeholder until the full dashboard UI (Today / Sprint Board / Goal
 * Dashboard views) is implemented in a later AC.
 *
 * Guard: if an authenticated user somehow lands here without completing
 * onboarding (edge case — middleware should have caught it), redirect back.
 */
export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  if (!session.user.onboardingCompleted) {
    redirect("/onboarding");
  }

  const name = session.user.name ?? session.user.email ?? "there";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal nav header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
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
            <span className="text-base font-semibold text-gray-900">
              GoalTracker
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {session.user.email}
            </span>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Dashboard placeholder content */}
      <main className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name ?? name}!
          </h1>
          <p className="mt-1 text-gray-600">
            Your goal tracking dashboard is being built. Check back soon.
          </p>
        </div>

        {/* Coming soon cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              title: "Today's Habits",
              description: "Check in on your daily habits and track your streaks.",
              icon: (
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              ),
              bg: "bg-orange-50",
            },
            {
              title: "Active Goals",
              description: "Review your SMART goals and milestone progress.",
              icon: (
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                </svg>
              ),
              bg: "bg-blue-50",
            },
            {
              title: "Sprint Board",
              description: "This week's action items and daily tasks.",
              icon: (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              bg: "bg-green-50",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-1 text-sm text-gray-600">{card.description}</p>
              </div>
              <span className="mt-auto inline-flex items-center text-xs font-medium text-gray-400">
                Coming soon
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
