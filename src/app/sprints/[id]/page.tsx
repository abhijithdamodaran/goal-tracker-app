"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  reviewedAt: string | null;
  actionItems: ActionItemData[];
}

interface ActionItemData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  done: boolean;
  milestone: { id: string; title: string; goal: { id: string; title: string } } | null;
  assignee: { id: string; name: string | null; image: string | null } | null;
}

interface UnassignedItem {
  id: string;
  title: string;
  done: boolean;
  milestone: { id: string; title: string; goal: { id: string; title: string } } | null;
  sprint: { id: string; name: string } | null;
}

function ActionRow({ item, onToggle, onRemove }: {
  item: ActionItemData;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-5 py-3 group hover:bg-gray-50 transition-colors">
      <button
        onClick={() => onToggle(item.id, !item.done)}
        className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
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
        <Link href={`/action-items/${item.id}`} className={`text-sm hover:underline ${item.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>
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
      {item.dueDate && (
        <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-500 font-medium" : "text-gray-400"}`}>
          {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition shrink-0"
        title="Remove from sprint"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  );
}

export default function SprintDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [sprint, setSprint] = useState<Sprint | null>(null);
  const [loading, setLoading] = useState(true);

  // New item form
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Assign existing panel
  const [showAssign, setShowAssign] = useState(false);
  const [unassigned, setUnassigned] = useState<UnassignedItem[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignSearch, setAssignSearch] = useState("");

  const loadSprint = useCallback(async () => {
    const res = await fetch(`/api/sprints/${id}`);
    const data = await res.json();
    if (res.ok) setSprint(data.sprint);
    else router.push("/sprints");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadSprint(); }, [loadSprint]);

  async function loadUnassigned() {
    setAssignLoading(true);
    const res = await fetch(`/api/action-items?excludeSprintId=${id}`);
    const data = res.ok ? await res.json() : { items: [] };
    setUnassigned(data.items ?? []);
    setAssignLoading(false);
  }

  async function toggleDone(itemId: string, done: boolean) {
    await fetch(`/api/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    setSprint((s) => s ? { ...s, actionItems: s.actionItems.map((a) => a.id === itemId ? { ...a, done } : a) } : s);
  }

  async function removeFromSprint(itemId: string) {
    await fetch(`/api/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId: null }),
    });
    setSprint((s) => s ? { ...s, actionItems: s.actionItems.filter((a) => a.id !== itemId) } : s);
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
        body: JSON.stringify({ title: newTitle.trim(), sprintId: id }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add item."); return; }
      setSprint((s) => s ? { ...s, actionItems: [...s.actionItems, data.item] } : s);
      setNewTitle(""); setShowAdd(false);
    } catch { setAddError("Something went wrong."); }
    finally { setAddLoading(false); }
  }

  async function assignExisting(item: UnassignedItem) {
    setAssigning(item.id);
    const res = await fetch(`/api/action-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId: id }),
    });
    if (res.ok) {
      const data = await res.json();
      setSprint((s) => s ? { ...s, actionItems: [...s.actionItems, { ...data.item, milestone: item.milestone, assignee: null }] } : s);
      setUnassigned((prev) => prev.filter((u) => u.id !== item.id));
    }
    setAssigning(null);
  }

  async function markReviewed() {
    const res = await fetch(`/api/sprints/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewedAt: new Date().toISOString() }),
    });
    const data = await res.json();
    if (res.ok) setSprint((s) => s ? { ...s, reviewedAt: data.sprint.reviewedAt } : s);
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>;
  if (!sprint) return null;

  const now = new Date();
  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const isCurrent = startDate <= now && endDate >= now;
  const isPast = endDate < now;
  const isReviewable = isPast && !sprint.reviewedAt;

  const todo = sprint.actionItems.filter((a) => !a.done);
  const done = sprint.actionItems.filter((a) => a.done);
  const pct = sprint.actionItems.length > 0 ? Math.round((done.length / sprint.actionItems.length) * 100) : 0;

  const filteredUnassigned = unassigned.filter((u) =>
    !assignSearch || u.title.toLowerCase().includes(assignSearch.toLowerCase()) ||
    u.milestone?.title.toLowerCase().includes(assignSearch.toLowerCase()) ||
    u.milestone?.goal.title.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/sprints" className="text-sm text-gray-500 hover:text-gray-700">← Sprints</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700 truncate max-w-40">{sprint.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {isCurrent && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Current</span>}
            {sprint.reviewedAt && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Reviewed</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Sprint header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{sprint.name}</h1>
          <p className="text-sm text-gray-500">
            {startDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}
            {" — "}
            {endDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {sprint.actionItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{done.length} of {sprint.actionItems.length} items complete</span>
                <span className="font-semibold text-gray-900">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Sprint review CTA */}
        {isReviewable && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-yellow-800 text-sm">Sprint ended — time to review</p>
              <p className="text-xs text-yellow-700 mt-0.5">You completed {done.length}/{sprint.actionItems.length} items ({pct}%)</p>
            </div>
            <button onClick={markReviewed} className="shrink-0 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-600">
              Mark reviewed
            </button>
          </div>
        )}

        {isPast && sprint.reviewedAt && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
            <p className="font-semibold text-green-800 text-sm">Sprint review complete</p>
            <p className="text-xs text-green-700 mt-0.5">
              Completed {done.length}/{sprint.actionItems.length} items ({pct}%) · Reviewed {new Date(sprint.reviewedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Action items board */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Action items</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAssign((v) => {
                    if (!v) { loadUnassigned(); setAssignSearch(""); }
                    return !v;
                  });
                  setShowAdd(false);
                }}
                className="text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                {showAssign ? "Cancel assign" : "Assign existing"}
              </button>
              <button
                onClick={() => { setShowAdd((v) => !v); setShowAssign(false); }}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                {showAdd ? "Cancel" : "+ New item"}
              </button>
            </div>
          </div>

          {/* New item form */}
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

          {/* Assign existing panel */}
          {showAssign && (
            <div className="border-b border-gray-100 bg-gray-50">
              <div className="px-5 pt-4 pb-3 space-y-2">
                <p className="text-xs font-medium text-gray-500">Select items to add to this sprint</p>
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search items…"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {assignLoading ? (
                <div className="px-5 py-4 text-xs text-gray-400">Loading…</div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="px-5 py-4 text-xs text-gray-400">
                  {unassigned.length === 0 ? "All action items are already in this sprint." : "No items match your search."}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {filteredUnassigned.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.done ? "text-gray-400 line-through" : "text-gray-800"}`}>{item.title}</p>
                        {item.milestone && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.milestone.goal.title} / {item.milestone.title}
                          </p>
                        )}
                        {item.sprint && (
                          <p className="text-xs text-orange-500 mt-0.5">Currently in: {item.sprint.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => assignExisting(item)}
                        disabled={assigning === item.id}
                        className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      >
                        {assigning === item.id ? "…" : "Add"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {sprint.actionItems.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-gray-500">No action items yet.</p>
              <p className="text-xs text-gray-400 mt-1">Add a new item or assign existing ones from your milestones.</p>
            </div>
          ) : (
            <div>
              {todo.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">To do ({todo.length})</span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {todo.map((item) => <ActionRow key={item.id} item={item} onToggle={toggleDone} onRemove={removeFromSprint} />)}
                  </ul>
                </div>
              )}
              {done.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Done ({done.length})</span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {done.map((item) => <ActionRow key={item.id} item={item} onToggle={toggleDone} onRemove={removeFromSprint} />)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
