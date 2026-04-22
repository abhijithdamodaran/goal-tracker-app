import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const STREAK_MODE_LABELS: Record<string, string> = {
  strict: "Strict",
  "one-grace-per-week": "1 grace/week",
  "percentage-threshold": "% threshold",
};

function StreakBadge({ count }: { count: number }) {
  const color = count >= 7 ? "bg-orange-100 text-orange-700" : count >= 3 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${color}`}>🔥 {count}</span>;
}

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);

  // Load today's check-ins for all habits
  const todayCheckIns = await prisma.habitCheckIn.findMany({
    where: {
      habitId: { in: habits.map((h) => h.id) },
      date: today,
    },
  });
  const checkedInToday = new Set(todayCheckIns.filter((c) => c.completed).map((c) => c.habitId));

  const dow = new Date().getDay();
  const scheduledToday = habits.filter((h) => {
    try {
      const days: number[] = JSON.parse(h.scheduledDays);
      return days.includes(dow);
    } catch { return true; }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Habits</h1>
          <Link href="/habits/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + New habit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {habits.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
            <p className="text-gray-500">No habits yet.</p>
            <p className="text-sm text-gray-400">Build recurring habits and track streaks to reach your goals.</p>
            <Link href="/habits/new" className="inline-block mt-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Create your first habit
            </Link>
          </div>
        )}

        {scheduledToday.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Today</h2>
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {scheduledToday.map((habit) => {
                const done = checkedInToday.has(habit.id);
                return (
                  <li key={habit.id} className="flex items-center gap-4 px-5 py-4">
                    <div className={`h-6 w-6 shrink-0 rounded-full border-2 flex items-center justify-center ${done ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
                      {done && <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/habits/${habit.id}`} className="text-sm font-medium text-gray-900 hover:underline truncate block">{habit.title}</Link>
                      {habit.description && <p className="text-xs text-gray-400 truncate">{habit.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StreakBadge count={habit.streakCount} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {habits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">All habits</h2>
            <ul className="divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {habits.map((habit) => {
                const days: number[] = (() => { try { return JSON.parse(habit.scheduledDays); } catch { return [0,1,2,3,4,5,6]; } })();
                const DAY_ABBR = ["Su","Mo","Tu","We","Th","Fr","Sa"];
                return (
                  <li key={habit.id}>
                    <Link href={`/habits/${habit.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{habit.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{days.map(d => DAY_ABBR[d]).join(" · ")}</span>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{STREAK_MODE_LABELS[habit.streakMode] ?? habit.streakMode}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StreakBadge count={habit.streakCount} />
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
