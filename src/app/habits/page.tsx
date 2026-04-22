import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const STREAK_MODE_LABELS: Record<string, string> = {
  strict: "Strict",
  "one-grace-per-week": "1 grace/wk",
  "percentage-threshold": "% threshold",
};

const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export default async function HabitsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  const today = new Date().toISOString().slice(0, 10);
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

  const habitsDoneToday = scheduledToday.filter((h) => checkedInToday.has(h.id)).length;
  const totalStreak = habits.reduce((sum, h) => sum + h.streakCount, 0);
  const longestStreak = habits.length > 0 ? Math.max(...habits.map((h) => h.streakCount)) : 0;

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">Habits</h1>
        <Link href="/habits/new" className="inline-flex items-center gap-1.5 bg-[#00152a] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#102a43] transition-colors">
          + New habit
        </Link>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Habits</h2>
          <p className="text-sm text-[#43474d] mt-1">Build recurring routines and track your momentum.</p>
        </div>

        {/* Empty state */}
        {habits.length === 0 && (
          <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-16 text-center space-y-3">
            <p className="text-sm text-[#74777e]">No habits yet.</p>
            <p className="text-xs text-[#74777e]">Build recurring habits and track streaks to reach your goals.</p>
            <Link href="/habits/new" className="inline-flex items-center gap-1.5 mt-2 bg-[#00152a] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-[#102a43] transition-colors">
              Create your first habit
            </Link>
          </div>
        )}

        {/* Stats bar */}
        {habits.length > 0 && (
          <div className="bg-white border border-[#DCE3E8] rounded-lg px-6 py-4 flex items-center gap-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Today</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">
                {habitsDoneToday}/{scheduledToday.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Active Habits</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">{habits.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Longest Streak</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">
                {longestStreak > 0 ? `🔥 ${longestStreak}` : "—"}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Total Streak Pts</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">{totalStreak}</p>
            </div>
          </div>
        )}

        {/* Today's scheduled habits */}
        {scheduledToday.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Scheduled Today</h2>
            <div className="bg-white border border-[#DCE3E8] rounded-lg overflow-hidden">
              <ul className="divide-y divide-[#DCE3E8]">
                {scheduledToday.map((habit) => {
                  const done = checkedInToday.has(habit.id);
                  const streakColor = habit.streakCount >= 7 ? "text-orange-600" : habit.streakCount >= 3 ? "text-[#00152a]" : "text-[#74777e]";
                  return (
                    <li key={habit.id} className="flex items-center gap-4 px-5 py-4">
                      <div className={`h-6 w-6 shrink-0 rounded border-2 flex items-center justify-center ${done ? "border-emerald-500 bg-emerald-500" : "border-[#DCE3E8]"}`}>
                        {done && (
                          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/habits/${habit.id}`} className={`text-sm font-medium hover:underline truncate block ${done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>
                          {habit.title}
                        </Link>
                        {habit.description && (
                          <p className="text-xs text-[#74777e] truncate mt-0.5">{habit.description}</p>
                        )}
                      </div>
                      <span className={`text-xs font-semibold shrink-0 ${streakColor}`}>🔥 {habit.streakCount}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* All habits */}
        {habits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">All Habits</h2>
            <div className="bg-white border border-[#DCE3E8] rounded-lg overflow-hidden">
              <ul className="divide-y divide-[#DCE3E8]">
                {habits.map((habit) => {
                  const days: number[] = (() => { try { return JSON.parse(habit.scheduledDays); } catch { return [0,1,2,3,4,5,6]; } })();
                  const streakColor = habit.streakCount >= 7 ? "text-orange-600" : habit.streakCount >= 3 ? "text-[#00152a]" : "text-[#74777e]";
                  return (
                    <li key={habit.id}>
                      <Link href={`/habits/${habit.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#171c1f] truncate">{habit.title}</p>
                          <div className="flex items-center gap-3 mt-1.5">
                            {/* Day dots */}
                            <div className="flex gap-1">
                              {[0,1,2,3,4,5,6].map((d) => (
                                <span
                                  key={d}
                                  className={`text-[9px] font-bold ${days.includes(d) ? "text-[#171c1f]" : "text-slate-300"}`}
                                >
                                  {DAY_ABBR[d]}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-[#74777e] font-medium">{STREAK_MODE_LABELS[habit.streakMode] ?? habit.streakMode}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className={`text-xs font-semibold ${streakColor}`}>🔥 {habit.streakCount}</span>
                          <svg className="h-3.5 w-3.5 text-[#74777e]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
