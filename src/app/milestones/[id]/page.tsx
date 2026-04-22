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
    <div className="min-h-screen bg-[#f6fafe] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00152a] border-t-transparent" />
    </div>
  );
  if (!milestone) return null;

  const total = milestone.actionItems.length;
  const done = milestone.actionItems.filter((a) => a.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#74777e]">
          <Link href="/goals" className="hover:text-[#43474d]">Goals</Link>
          <span className="text-[#DCE3E8]">/</span>
          <Link href={`/goals/${milestone.goal.id}`} className="hover:text-[#43474d] truncate max-w-32">{milestone.goal.title}</Link>
          <span className="text-[#DCE3E8]">/</span>
          <span className="text-[#171c1f] font-medium truncate max-w-32">{milestone.title}</span>
        </div>
        <button
          onClick={toggleComplete}
          disabled={completing}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            milestone.completedAt
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              : "bg-[#00152a] text-white hover:bg-[#102a43]"
          }`}
        >
          {completing ? "…" : milestone.completedAt ? "✓ Complete" : "Mark complete"}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {/* Milestone header */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-6 space-y-3">
          <h1 className={`text-2xl font-semibold tracking-tight ${milestone.completedAt ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>
            {milestone.title}
          </h1>
          {milestone.description && <p className="text-sm text-[#43474d]">{milestone.description}</p>}
          {total > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#43474d]">{done}/{total} items done</span>
                <span className="font-semibold text-[#171c1f]">{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Context */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-5 space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-3">Context</h2>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[10px] text-[#74777e] w-16 shrink-0">Goal</span>
            <Link href={`/goals/${milestone.goal.id}`} className="font-medium text-[#00152a] hover:underline truncate">{milestone.goal.title}</Link>
            {milestone.goal.workspaceType === "family" && (
              <span className="ml-1 inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">Family</span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[10px] text-[#74777e] w-16 shrink-0">Cycle</span>
            <Link href={`/cycles/${milestone.cycle.id}`} className="font-medium text-[#00152a] hover:underline">{milestone.cycle.name}</Link>
            <span className="text-[10px] text-[#74777e]">{CYCLE_TYPE_LABEL[milestone.cycle.type] ?? milestone.cycle.type}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[10px] text-[#74777e] w-16 shrink-0">Dates</span>
            <span className="text-[#43474d]">
              {new Date(milestone.cycle.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              {" – "}
              {new Date(milestone.cycle.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Action items */}
        <section className="rounded-lg border border-[#DCE3E8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3E8]">
            <h2 className="text-sm font-semibold text-[#171c1f]">Action items</h2>
            <button onClick={() => setShowAdd((v) => !v)} className="text-xs font-medium text-[#00152a] hover:underline">
              {showAdd ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAdd && (
            <form onSubmit={handleAddItem} className="px-5 py-4 bg-slate-50 border-b border-[#DCE3E8] space-y-3">
              {addError && <p className="text-xs text-red-600">{addError}</p>}
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (addError) setAddError(""); }}
                placeholder="What needs to get done?"
                className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2 text-sm focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={addLoading} className="rounded-md bg-[#00152a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#102a43] disabled:opacity-60">
                  {addLoading ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => { setShowAdd(false); setAddError(""); }} className="rounded-md border border-[#DCE3E8] px-4 py-2 text-xs text-[#43474d] hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {milestone.actionItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-[#74777e]">No action items yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#DCE3E8]">
              {milestone.actionItems.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3 group hover:bg-slate-50 transition-colors">
                  <button
                    onClick={() => toggleActionItem(item)}
                    disabled={toggling === item.id}
                    className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition disabled:opacity-60 ${
                      item.done ? "border-emerald-500 bg-emerald-500" : "border-[#DCE3E8] hover:border-[#00152a]"
                    }`}
                  >
                    {item.done && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <Link href={`/action-items/${item.id}`} className={`text-sm font-medium hover:underline ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>
                      {item.title}
                    </Link>
                    {item.sprint && (
                      <p className="text-[10px] text-[#74777e] mt-0.5">
                        <Link href={`/sprints/${item.sprint.id}`} className="hover:underline">{item.sprint.name}</Link>
                      </p>
                    )}
                  </div>
                  {item.dueDate && (
                    <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-500 font-medium" : "text-[#74777e]"}`}>
                      {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 text-[#74777e] hover:text-red-500 transition shrink-0"
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
