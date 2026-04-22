"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface HabitData {
  id: string;
  title: string;
  description: string | null;
  streakMode: string;
  percentageThreshold: number;
  scheduledDays: string;
  streakCount: number;
  longestStreak: number;
  lastCompletedDate: string | null;
  currentStreakStartDate: string | null;
}

interface CheckIn {
  id: string;
  date: string;
  completed: boolean;
}

const STREAK_MODE_LABELS: Record<string, string> = {
  strict: "Strict — any miss resets streak",
  "one-grace-per-week": "1 grace/week — one skip per week allowed",
  "percentage-threshold": "% threshold — streak survives above threshold",
};

const DAY_ABBR = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getLast28Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

export default function HabitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [habit, setHabit] = useState<HabitData | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const loadData = useCallback(async () => {
    const [habitRes, checkInRes] = await Promise.all([
      fetch(`/api/habits/${id}`),
      fetch(`/api/habits/${id}/check-ins`),
    ]);
    if (!habitRes.ok) { router.push("/habits"); return; }
    const habitData = await habitRes.json();
    const ciData = checkInRes.ok ? await checkInRes.json() : { checkIns: [] };
    setHabit(habitData.habit);
    setCheckIns(ciData.checkIns ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const todayCheckIn = checkIns.find((c) => c.date === today);
  const isCheckedInToday = todayCheckIn?.completed ?? false;

  async function handleCheckIn() {
    if (!habit || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await fetch(`/api/habits/${id}/check-ins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today, completed: !isCheckedInToday }),
      });
      const data = await res.json();
      if (res.ok) {
        setCheckIns((prev) => {
          const filtered = prev.filter((c) => c.date !== today);
          return [...filtered, data.checkIn];
        });
        if (data.streak) {
          setHabit((h) => h ? { ...h, streakCount: data.streak.streakCount, longestStreak: data.streak.longestStreak, lastCompletedDate: data.streak.lastCompletedDate } : h);
        }
      }
    } finally { setCheckingIn(false); }
  }

  async function handleArchive() {
    setArchiving(true);
    await fetch(`/api/habits/${id}`, { method: "DELETE" });
    router.push("/habits");
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  if (!habit) return null;

  const scheduledDays: number[] = (() => { try { return JSON.parse(habit.scheduledDays); } catch { return [0,1,2,3,4,5,6]; } })();
  const checkInMap = new Map(checkIns.map((c) => [c.date, c.completed]));
  const last28 = getLast28Days();
  const dow = new Date().getDay();
  const isScheduledToday = scheduledDays.includes(dow);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/habits" className="text-sm text-gray-500 hover:text-gray-700">← Habits</Link>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              habit.streakCount >= 7 ? "bg-orange-100 text-orange-700" : habit.streakCount >= 3 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
            }`}>🔥 {habit.streakCount} day streak</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Title + check-in */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{habit.title}</h1>
              {habit.description && <p className="text-sm text-gray-500 mt-1">{habit.description}</p>}
            </div>
            {isScheduledToday && (
              <button
                onClick={handleCheckIn}
                disabled={checkingIn}
                className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
                  isCheckedInToday
                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                {checkingIn ? "…" : isCheckedInToday ? "✓ Done today" : "Check in"}
              </button>
            )}
          </div>
        </div>

        {/* Streak stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Current streak", value: `${habit.streakCount}d` },
            { label: "Longest streak", value: `${habit.longestStreak}d` },
            { label: "Last completed", value: habit.lastCompletedDate ? new Date(habit.lastCompletedDate + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Config */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Configuration</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-24 shrink-0">Schedule</span>
              <span className="font-medium">{scheduledDays.map(d => DAY_ABBR[d]).join(" · ")}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs w-24 shrink-0">Mode</span>
              <span className="font-medium">{STREAK_MODE_LABELS[habit.streakMode] ?? habit.streakMode}</span>
            </div>
            {habit.streakMode === "percentage-threshold" && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs w-24 shrink-0">Threshold</span>
                <span className="font-medium">{Math.round(habit.percentageThreshold * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* History — last 28 days */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Last 28 days</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {["Su","Mo","Tu","We","Th","Fr","Sa"].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 font-medium pb-1">{d}</div>
            ))}
            {/* Padding for the first day of the 28-day window */}
            {Array.from({ length: new Date(last28[0] + "T12:00:00").getDay() }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}
            {last28.map((date) => {
              const completed = checkInMap.get(date);
              const isToday = date === today;
              const d = new Date(date + "T12:00:00");
              const scheduled = scheduledDays.includes(d.getDay());
              return (
                <div
                  key={date}
                  title={date}
                  className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium ${
                    completed ? "bg-green-500 text-white" :
                    completed === false && scheduled ? "bg-red-100 text-red-400" :
                    scheduled ? "bg-gray-100 text-gray-400" :
                    "bg-gray-50 text-gray-300"
                  } ${isToday ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                >
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400">Green = completed · Red = missed · Gray = not scheduled</p>
        </div>

        {/* Archive */}
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="font-semibold text-red-700 text-sm">Danger zone</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">Archive this habit</p>
            <button onClick={handleArchive} disabled={archiving} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60">
              {archiving ? "Archiving…" : "Archive"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
