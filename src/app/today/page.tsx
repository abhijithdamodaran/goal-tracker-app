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
  const color = count >= 7 ? "bg-orange-100 text-orange-700" : count >= 3 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>🔥 {count}</span>;
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <h1 className="text-base font-semibold text-gray-900">Today</h1>
          </div>
          <span className="text-sm text-gray-500 hidden sm:block">{todayLabel}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{habitsDone}/{totalHabits}</p>
            <p className="text-xs text-gray-500 mt-0.5">Habits today</p>
            {totalHabits > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${habitsDone === totalHabits ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${totalHabits > 0 ? (habitsDone/totalHabits)*100 : 0}%` }} />
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{actionsDone}/{totalActions}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sprint items</p>
            {totalActions > 0 && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${actionsDone === totalActions ? "bg-green-500" : "bg-orange-400"}`} style={{ width: `${totalActions > 0 ? (actionsDone/totalActions)*100 : 0}%` }} />
              </div>
            )}
          </div>
        </div>

        {/* Today's habits */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Habits</h2>
            <Link href="/habits/new" className="text-xs font-medium text-blue-600 hover:text-blue-700">+ New</Link>
          </div>
          {scheduledHabits.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-500">No habits scheduled for today.</p>
              <Link href="/habits/new" className="mt-1 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Create a habit →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {scheduledHabits.map((habit) => {
                const done = checkIns[habit.id] ?? false;
                const isLoading = checkingIn === habit.id;
                return (
                  <li key={habit.id} className="flex items-center gap-4 px-5 py-4">
                    <button
                      onClick={() => handleCheckIn(habit.id)}
                      disabled={isLoading}
                      className={`h-8 w-8 shrink-0 rounded-full border-2 flex items-center justify-center transition disabled:opacity-60 ${
                        done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400 hover:bg-green-50"
                      }`}
                    >
                      {isLoading ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : done ? (
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : null}
                    </button>
                    <div className="flex-1 min-w-0">
                      <Link href={`/habits/${habit.id}`} className={`text-sm font-medium hover:underline ${done ? "text-gray-400 line-through" : "text-gray-900"}`}>
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
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Sprint items</h2>
            {sprint ? (
              <Link href={`/sprints/${sprint.id}`} className="text-xs font-medium text-blue-600 hover:text-blue-700">View sprint →</Link>
            ) : (
              <Link href="/sprints/new" className="text-xs font-medium text-blue-600 hover:text-blue-700">Start sprint</Link>
            )}
          </div>
          {!sprint ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-500">No active sprint this week.</p>
              <Link href="/sprints/new" className="mt-1 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Start a sprint →</Link>
            </div>
          ) : todayItems.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-gray-500">No items in the current sprint.</p>
              <Link href={`/sprints/${sprint.id}`} className="mt-1 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Add items →</Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {[...todoItems, ...doneItems].map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                  <button
                    onClick={() => toggleActionItem(item.id, !item.done)}
                    className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                      item.done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"
                    }`}
                  >
                    {item.done && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>{item.title}</p>
                    {item.milestone && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.milestone.goal.title} / {item.milestone.title}</p>
                    )}
                  </div>
                  {item.dueDate && !item.done && (
                    <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() ? "text-red-500 font-medium" : "text-gray-400"}`}>
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
          <Link href="/habits" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 shadow-sm">All habits</Link>
          <Link href="/sprints" className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-center font-medium text-gray-700 hover:bg-gray-50 shadow-sm">All sprints</Link>
        </div>
      </main>
    </div>
  );
}
