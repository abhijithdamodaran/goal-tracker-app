"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface HabitData {
  id: string;
  title: string;
  description: string | null;
  streakCount: number;
  scheduledDays: string;
  streakMode: string;
}

interface CheckInMap { [habitId: string]: boolean; }

interface ActionItemData {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  milestone: { id: string; title: string; goal: { id: string; title: string } } | null;
  sprint: { id: string; name: string } | null;
}

interface SprintData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  actionItems: ActionItemData[];
}

function StreakBadge({ count }: { count: number }) {
  const color = count >= 7 ? "text-orange-600" : count >= 3 ? "text-[#00152a]" : "text-[#74777e]";
  return <span className={`text-xs font-semibold shrink-0 ${color}`}>🔥 {count}</span>;
}

export default function TodayPage() {
  const [habits, setHabits] = useState<HabitData[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInMap>({});
  const [sprint, setSprint] = useState<SprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const dow = new Date().getDay();

  const loadData = useCallback(async () => {
    const [habitsRes, sprintsRes] = await Promise.all([
      fetch("/api/habits"),
      fetch("/api/sprints"),
    ]);

    const habitsData = habitsRes.ok ? await habitsRes.json() : { habits: [] };
    const sprintsData = sprintsRes.ok ? await sprintsRes.json() : { sprints: [] };

    const allHabits: HabitData[] = habitsData.habits ?? [];
    setHabits(allHabits);

    // Load today's check-ins for all habits
    if (allHabits.length > 0) {
      const ciResults = await Promise.allSettled(
        allHabits.map((h) => fetch(`/api/habits/${h.id}/check-ins`).then(r => r.json()))
      );
      const ciMap: CheckInMap = {};
      ciResults.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const todayCi = (result.value.checkIns ?? []).find((c: { date: string; completed: boolean }) => c.date === today);
          ciMap[allHabits[i].id] = todayCi?.completed ?? false;
        }
      });
      setCheckIns(ciMap);
    }

    // Find current sprint
    const now = new Date();
    const currentSprint = (sprintsData.sprints ?? []).find((s: SprintData) =>
      new Date(s.startDate) <= now && new Date(s.endDate) >= now
    );
    if (currentSprint) {
      const sprintRes = await fetch(`/api/sprints/${currentSprint.id}`);
      const sprintData = sprintRes.ok ? await sprintRes.json() : null;
      if (sprintData) setSprint(sprintData.sprint);
    }

    setLoading(false);
  }, [today]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCheckIn(habitId: string) {
    if (checkingIn) return;
    setCheckingIn(habitId);
    const current = checkIns[habitId] ?? false;
    try {
      const res = await fetch(`/api/habits/${habitId}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, completed: !current }),
      });
      if (res.ok) {
        const data = await res.json();
        setCheckIns((prev) => ({ ...prev, [habitId]: data.checkIn.completed }));
        if (data.streak) {
          setHabits((prev) => prev.map((h) => h.id === habitId ? { ...h, streakCount: data.streak.streakCount } : h));
        }
      }
    } finally { setCheckingIn(null); }
  }

  async function toggleActionItem(itemId: string, done: boolean) {
    await fetch(`/api/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    setSprint((s) => s ? { ...s, actionItems: s.actionItems.map((a) => a.id === itemId ? { ...a, done } : a) } : s);
  }

  const scheduledHabits = habits.filter((h) => {
    try { return (JSON.parse(h.scheduledDays) as number[]).includes(dow); }
    catch { return true; }
  });

  const todayItems = sprint?.actionItems ?? [];
  const todoItems = todayItems.filter((a) => !a.done);
  const doneItems = todayItems.filter((a) => a.done);

  const habitsDone = scheduledHabits.filter((h) => checkIns[h.id]).length;
  const totalHabits = scheduledHabits.length;
  const actionsDone = doneItems.length;
  const totalActions = todayItems.length;

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  if (loading) return (
    <div className="min-h-screen bg-[#f6fafe] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00152a] border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      <header className="sticky top-0 z-30 border-b border-[#DCE3E8] bg-white px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">Today</h1>
        <span className="text-xs text-[#74777e] hidden sm:block">{todayLabel}</span>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border border-[#DCE3E8] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-3">Habits Today</p>
            <p className="text-3xl font-semibold text-[#171c1f] tracking-tight leading-none mb-3">{habitsDone}/{totalHabits}</p>
            {totalHabits > 0 && (
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${habitsDone === totalHabits ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${totalHabits > 0 ? (habitsDone/totalHabits)*100 : 0}%` }} />
              </div>
            )}
          </div>
          <div className="rounded-lg border border-[#DCE3E8] bg-white p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-3">Sprint Items</p>
            <p className="text-3xl font-semibold text-[#171c1f] tracking-tight leading-none mb-3">{actionsDone}/{totalActions}</p>
            {totalActions > 0 && (
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${actionsDone === totalActions ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${totalActions > 0 ? (actionsDone/totalActions)*100 : 0}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Today's habits */}
        <section className="rounded-lg border border-[#DCE3E8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3E8]">
            <h2 className="text-sm font-semibold text-[#171c1f]">Habits Today</h2>
            <Link href="/habits/new" className="text-xs font-medium text-[#00152a] hover:underline">+ New</Link>
          </div>
          {scheduledHabits.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-[#74777e]">No habits scheduled for today.</p>
              <Link href="/habits/new" className="mt-1 inline-block text-sm font-medium text-[#00152a] hover:underline">Create a habit →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#DCE3E8]">
              {scheduledHabits.map((habit) => {
                const done = checkIns[habit.id] ?? false;
                const isLoading = checkingIn === habit.id;
                return (
                  <li key={habit.id} className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => handleCheckIn(habit.id)}
                      disabled={isLoading}
                      className={`h-7 w-7 shrink-0 rounded border-2 flex items-center justify-center transition disabled:opacity-60 ${
                        done ? "border-emerald-500 bg-emerald-500" : "border-[#DCE3E8] hover:border-[#00152a]"
                      }`}
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : done ? (
                        <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <Link href={`/habits/${habit.id}`} className={`text-sm font-medium hover:underline ${done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>
                        {habit.title}
                      </Link>
                    </div>
                    <StreakBadge count={habit.streakCount} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Today's sprint items */}
        <section className="rounded-lg border border-[#DCE3E8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3E8]">
            <h2 className="text-sm font-semibold text-[#171c1f]">Sprint Items</h2>
            {sprint ? (
              <Link href={`/sprints/${sprint.id}`} className="text-xs font-medium text-[#00152a] hover:underline">View sprint →</Link>
            ) : (
              <Link href="/sprints/new" className="text-xs font-medium text-[#00152a] hover:underline">Start sprint</Link>
            )}
          </div>
          {!sprint ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-[#74777e]">No active sprint this week.</p>
              <Link href="/sprints/new" className="mt-1 inline-block text-sm font-medium text-[#00152a] hover:underline">Start a sprint →</Link>
            </div>
          ) : todayItems.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-[#74777e]">No items in the current sprint.</p>
              <Link href={`/sprints/${sprint.id}`} className="mt-1 inline-block text-sm font-medium text-[#00152a] hover:underline">Add items →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#DCE3E8]">
              {[...todoItems, ...doneItems].map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <button
                    onClick={() => toggleActionItem(item.id, !item.done)}
                    className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition ${
                      item.done ? "border-emerald-500 bg-emerald-500" : "border-[#DCE3E8] hover:border-[#00152a]"
                    }`}
                  >
                    {item.done && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f] font-medium"}`}>{item.title}</p>
                    {item.milestone && (
                      <p className="text-xs text-[#74777e] mt-0.5 truncate">{item.milestone.goal.title} / {item.milestone.title}</p>
                    )}
                  </div>
                  {item.dueDate && !item.done && (
                    <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() ? "text-red-500 font-medium" : "text-[#74777e]"}`}>
                      {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Link href="/habits" className="rounded-md border border-[#DCE3E8] bg-white px-4 py-3 text-center text-xs font-medium text-[#43474d] hover:bg-slate-50 transition-colors">All habits</Link>
          <Link href="/sprints" className="rounded-md border border-[#DCE3E8] bg-white px-4 py-3 text-center text-xs font-medium text-[#43474d] hover:bg-slate-50 transition-colors">All sprints</Link>
        </div>
      </main>
    </div>
  );
}
