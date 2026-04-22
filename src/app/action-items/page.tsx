"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ActionItemData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  done: boolean;
  milestone: { id: string; title: string; goal: { id: string; title: string } } | null;
  sprint: { id: string; name: string } | null;
}

type Tab = "all" | "todo" | "done";

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [toggling, setToggling] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/action-items");
    const data = res.ok ? await res.json() : { items: [] };
    setItems(data.items ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadItems(); }, [loadItems]);

  async function toggleDone(item: ActionItemData) {
    if (toggling) return;
    setToggling(item.id);
    const res = await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((a) => a.id === item.id ? { ...a, done: !a.done } : a));
    }
    setToggling(null);
  }

  const filtered = items.filter((a) =>
    tab === "all" ? true : tab === "todo" ? !a.done : a.done
  );

  const remaining = items.filter((a) => !a.done).length;
  const completed = items.filter((a) => a.done).length;
  const counts = { all: items.length, todo: remaining, done: completed };

  const today = new Date();
  const overdue = items.filter((a) => !a.done && a.dueDate && new Date(a.dueDate) < today).length;
  const dueToday = items.filter((a) => !a.done && a.dueDate && new Date(a.dueDate).toDateString() === today.toDateString()).length;

  if (loading) return (
    <div className="min-h-screen bg-[#f6fafe] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00152a] border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center">
        <h1 className="text-sm font-semibold text-[#171c1f]">Action Items</h1>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Action Items</h2>
          <p className="text-sm text-[#43474d] mt-1">Discrete tasks to push your milestones forward.</p>
        </div>

        <div className="flex gap-6 items-start">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Stats + tabs row */}
            <div className="bg-white border border-[#DCE3E8] rounded-lg px-5 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Remaining</p>
                  <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight">{remaining}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Completed</p>
                  <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight">{completed}</p>
                </div>
                {items.length > 0 && (
                  <div className="hidden sm:block">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Done Rate</p>
                    <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight">
                      {Math.round((completed / items.length) * 100)}%
                    </p>
                  </div>
                )}
              </div>
              {/* Tabs */}
              <div className="flex items-center gap-1 shrink-0">
                {(["all", "todo", "done"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
                      tab === t
                        ? "bg-[#00152a] text-white"
                        : "text-[#43474d] hover:bg-slate-100 border border-[#DCE3E8]"
                    }`}
                  >
                    {t} <span className="opacity-60">{counts[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Items list */}
            {filtered.length === 0 ? (
              <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-14 text-center">
                <p className="text-sm text-[#74777e]">
                  {tab === "all" ? "No action items yet." : tab === "todo" ? "Nothing left to do." : "Nothing completed yet."}
                </p>
                {tab === "all" && (
                  <p className="mt-1 text-xs text-[#74777e]">Create action items from a goal&apos;s milestone.</p>
                )}
              </div>
            ) : (
              <div className="bg-white border border-[#DCE3E8] rounded-lg overflow-hidden">
                <ul className="divide-y divide-[#DCE3E8]">
                  {filtered.map((item) => {
                    const isOverdue = !item.done && item.dueDate && new Date(item.dueDate) < today;
                    return (
                      <li key={item.id} className="flex items-start gap-3 px-5 py-4 hover:bg-slate-50 transition-colors">
                        <button
                          onClick={() => toggleDone(item)}
                          disabled={toggling === item.id}
                          className={`mt-0.5 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition disabled:opacity-60 ${
                            item.done
                              ? "border-emerald-500 bg-emerald-500"
                              : "border-[#DCE3E8] hover:border-[#00152a]"
                          }`}
                        >
                          {item.done && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/action-items/${item.id}`}
                            className={`text-sm font-medium hover:underline ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}
                          >
                            {item.title}
                          </Link>
                          {item.milestone && (
                            <p className="text-[10px] text-[#74777e] mt-0.5 truncate uppercase tracking-wide font-medium">
                              <Link href={`/goals/${item.milestone.goal.id}`} className="hover:underline">{item.milestone.goal.title}</Link>
                              <span className="mx-1">›</span>
                              <Link href={`/milestones/${item.milestone.id}`} className="hover:underline">{item.milestone.title}</Link>
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {item.sprint && (
                            <Link href={`/sprints/${item.sprint.id}`} className="text-[10px] text-[#74777e] hover:underline bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.sprint.name}
                            </Link>
                          )}
                          {item.dueDate && (
                            <span className={`text-[10px] font-medium ${isOverdue ? "text-red-600" : "text-[#74777e]"}`}>
                              {isOverdue && "⚠ "}
                              {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {/* Quick add row */}
                <div className="flex items-center gap-3 px-5 py-3 border-t border-[#DCE3E8] text-[#74777e]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  <span className="text-xs text-[#74777e]">Add a quick action item — or create from a milestone</span>
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-56 shrink-0">
            {/* Due stats */}
            <div className="bg-white border border-[#DCE3E8] rounded-lg p-4 grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className={`text-2xl font-bold ${overdue > 0 ? "text-red-600" : "text-[#171c1f]"}`}>{overdue}</div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mt-0.5">Overdue</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#171c1f]">{dueToday}</div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mt-0.5">Due Today</p>
              </div>
            </div>

            {/* Quick links */}
            <div className="bg-white border border-[#DCE3E8] rounded-lg p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-3">Quick Links</p>
              {[
                { href: "/goals", label: "Goals" },
                { href: "/sprints", label: "Sprints" },
                { href: "/cycles", label: "Cycles" },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="flex items-center justify-between py-1.5 text-sm text-[#43474d] hover:text-[#171c1f] transition-colors">
                  {label}
                  <svg className="h-3.5 w-3.5 text-[#74777e]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
