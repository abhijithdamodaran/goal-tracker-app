"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface ActionItemData {
  id: string;
  title: string;
  done: boolean;
  dueDate: string | null;
  sprint: { id: string; name: string } | null;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  completedAt: string | null;
  goal: { id: string; title: string; workspaceType: string };
  cycle: { id: string; name: string; type: string; startDate: string; endDate: string };
  actionItems: ActionItemData[];
}

const CYCLE_TYPE_LABEL: Record<string, string> = {
  monthly: "Monthly", quarterly: "Quarterly", "half-yearly": "Half-yearly", yearly: "Yearly",
};

export default function MilestoneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [milestone, setMilestone] = useState<MilestoneData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Add item inline
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const loadMilestone = useCallback(async () => {
    const res = await fetch(`/api/milestones/${id}`);
    if (!res.ok) { router.push("/goals"); return; }
    const data = await res.json();
    setMilestone(data.milestone);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadMilestone(); }, [loadMilestone]);

  async function toggleActionItem(item: ActionItemData) {
    if (toggling) return;
    setToggling(item.id);
    const res = await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    if (res.ok) {
      setMilestone((m) => m ? {
        ...m,
        actionItems: m.actionItems.map((a) => a.id === item.id ? { ...a, done: !a.done } : a),
      } : m);
    }
    setToggling(null);
  }

  async function toggleComplete() {
    if (!milestone || completing) return;
    setCompleting(true);
    const res = await fetch(`/api/milestones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt: milestone.completedAt ? null : new Date().toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      setMilestone((m) => m ? { ...m, completedAt: data.milestone.completedAt } : m);
    }
    setCompleting(false);
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) { setAddError("Title is required."); return; }
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), milestoneId: id }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add."); return; }
      setMilestone((m) => m ? { ...m, actionItems: [...m.actionItems, data.item] } : m);
      setNewTitle(""); setShowAdd(false);
    } catch { setAddError("Something went wrong."); }
    finally { setAddLoading(false); }
  }

  async function deleteItem(itemId: string) {
    await fetch(`/api/action-items/${itemId}`, { method: "DELETE" });
    setMilestone((m) => m ? { ...m, actionItems: m.actionItems.filter((a) => a.id !== itemId) } : m);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
  if (!milestone) return null;

  const total = milestone.actionItems.length;
  const done = milestone.actionItems.filter((a) => a.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/goals" className="hover:text-gray-700">Goals</Link>
            <span>/</span>
            <Link href={`/goals/${milestone.goal.id}`} className="hover:text-gray-700 truncate max-w-32">{milestone.goal.title}</Link>
            <span>/</span>
            <span className="text-gray-700 truncate max-w-32">{milestone.title}</span>
          </div>
          <button
            onClick={toggleComplete}
            disabled={completing}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
              milestone.completedAt
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {completing ? "…" : milestone.completedAt ? "✓ Complete" : "Mark complete"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {/* Milestone header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h1 className={`text-2xl font-bold ${milestone.completedAt ? "text-gray-400 line-through" : "text-gray-900"}`}>
            {milestone.title}
          </h1>
          {milestone.description && <p className="text-sm text-gray-600">{milestone.description}</p>}
          {total > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{done}/{total} items done</span>
                <span className="font-semibold text-gray-900">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Context */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-2">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Context</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-400 w-16 shrink-0">Goal</span>
            <Link href={`/goals/${milestone.goal.id}`} className="font-medium text-blue-600 hover:underline truncate">{milestone.goal.title}</Link>
            {milestone.goal.workspaceType === "family" && (
              <span className="ml-1 inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Family</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-400 w-16 shrink-0">Cycle</span>
            <Link href={`/cycles/${milestone.cycle.id}`} className="font-medium text-blue-600 hover:underline">{milestone.cycle.name}</Link>
            <span className="text-xs text-gray-400">{CYCLE_TYPE_LABEL[milestone.cycle.type] ?? milestone.cycle.type}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-xs text-gray-400 w-16 shrink-0">Dates</span>
            <span className="text-gray-600">
              {new Date(milestone.cycle.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {" – "}
              {new Date(milestone.cycle.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Action items */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Action items</h2>
            <button onClick={() => setShowAdd((v) => !v)} className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              {showAdd ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAddItem} className="px-5 py-4 bg-blue-50 border-b border-gray-100 space-y-3">
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (addError) setAddError(""); }}
                placeholder="What needs to get done?"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={addLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {addLoading ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {milestone.actionItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-500">No action items yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {milestone.actionItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleActionItem(item)}
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
                    <Link href={`/action-items/${item.id}`} className={`text-sm font-medium hover:underline ${item.done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      {item.title}
                    </Link>
                    {item.sprint && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        <Link href={`/sprints/${item.sprint.id}`} className="hover:underline">{item.sprint.name}</Link>
                      </p>
                    )}
                  </div>
                  {item.dueDate && (
                    <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-500 font-medium" : "text-gray-400"}`}>
                      {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition shrink-0"
                    title="Delete"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
