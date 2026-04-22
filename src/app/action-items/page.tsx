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

  const counts = { all: items.length, todo: items.filter((a) => !a.done).length, done: items.filter((a) => a.done).length };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Action Items</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          {(["all", "todo", "done"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
                tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t} <span className="ml-1 text-xs opacity-60">{counts[t]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-sm text-gray-500">
              {tab === "all" ? "No action items yet." : tab === "todo" ? "Nothing left to do." : "Nothing completed yet."}
            </p>
            {tab === "all" && (
              <p className="mt-1 text-xs text-gray-400">Create action items from a goal's milestone.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((item) => (
              <li key={item.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <button
                  onClick={() => toggleDone(item)}
                  disabled={toggling === item.id}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition disabled:opacity-60 ${
                    item.done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"
                  }`}
                >
                  {item.done && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <Link href={`/action-items/${item.id}`} className={`text-sm font-medium hover:underline ${item.done ? "text-gray-400 line-through" : "text-gray-900"}`}>
                    {item.title}
                  </Link>
                  {item.milestone && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      <Link href={`/goals/${item.milestone.goal.id}`} className="hover:underline">{item.milestone.goal.title}</Link>
                      {" / "}
                      <Link href={`/milestones/${item.milestone.id}`} className="hover:underline">{item.milestone.title}</Link>
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {item.sprint && (
                    <Link href={`/sprints/${item.sprint.id}`} className="text-xs text-blue-600 hover:underline">
                      {item.sprint.name}
                    </Link>
                  )}
                  {item.dueDate && (
                    <span className={`text-xs ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
