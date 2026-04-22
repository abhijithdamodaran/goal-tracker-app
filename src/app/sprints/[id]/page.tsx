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
    <li className="flex items-center gap-3 px-5 py-3 group hover:bg-slate-50 transition-colors">
      <button
        onClick={() => onToggle(item.id, !item.done)}
        className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition ${
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
        <Link href={`/action-items/${item.id}`} className={`text-sm hover:underline ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f] font-medium"}`}>
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
      {item.dueDate && (
        <span className={`text-xs shrink-0 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-500 font-medium" : "text-[#74777e]"}`}>
          {new Date(item.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      )}
      <button
        onClick={() => onRemove(item.id)}
        className="opacity-0 group-hover:opacity-100 text-[#74777e] hover:text-red-500 transition shrink-0"
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

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

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

  if (loading) return (
    <div className="min-h-screen bg-[#f6fafe] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00152a] border-t-transparent" />
    </div>
  );
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
    <div className="min-h-screen bg-[#f6fafe]">
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#74777e]">
          <Link href="/sprints" className="hover:text-[#43474d]">Sprints</Link>
          <span className="text-[#DCE3E8]">/</span>
          <span className="text-[#171c1f] font-medium truncate max-w-40">{sprint.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCurrent && <span className="rounded-md bg-[#00152a] px-2 py-0.5 text-xs font-medium text-white">Current</span>}
          {sprint.reviewedAt && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Reviewed</span>}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Sprint header */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-[#171c1f] tracking-tight">{sprint.name}</h1>
          <p className="text-sm text-[#74777e]">
            {startDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" })}
            {" — "}
            {endDate.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
          </p>
          {sprint.actionItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#43474d]">{done.length} of {sprint.actionItems.length} items complete</span>
                <span className="font-semibold text-[#171c1f]">{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Sprint review CTA */}
        {isReviewable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800 text-sm">Sprint ended — time to review</p>
              <p className="text-xs text-amber-700 mt-0.5">You completed {done.length}/{sprint.actionItems.length} items ({pct}%)</p>
            </div>
            <button onClick={markReviewed} className="shrink-0 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600">
              Mark reviewed
            </button>
          </div>
        )}

        {isPast && sprint.reviewedAt && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
            <p className="font-semibold text-emerald-800 text-sm">Sprint review complete</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Completed {done.length}/{sprint.actionItems.length} items ({pct}%) · Reviewed {new Date(sprint.reviewedAt).toLocaleDateString()}
            </p>
          </div>
        )}

        {/* Action items board */}
        <section className="rounded-lg border border-[#DCE3E8] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3E8]">
            <h2 className="text-sm font-semibold text-[#171c1f]">Action items</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowAssign((v) => {
                    if (!v) { loadUnassigned(); setAssignSearch(""); }
                    return !v;
                  });
                  setShowAdd(false);
                }}
                className="text-xs font-medium text-[#43474d] hover:text-[#171c1f]"
              >
                {showAssign ? "Cancel" : "Assign existing"}
              </button>
              <button
                onClick={() => { setShowAdd((v) => !v); setShowAssign(false); }}
                className="text-xs font-medium text-[#00152a] hover:underline"
              >
                {showAdd ? "Cancel" : "+ New item"}
              </button>
            </div>
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

          {showAssign && (
            <div className="border-b border-[#DCE3E8] bg-slate-50">
              <div className="px-5 pt-4 pb-3 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Select items to add to this sprint</p>
                <input
                  autoFocus
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  placeholder="Search items…"
                  className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2 text-sm focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
                />
              </div>
              {assignLoading ? (
                <div className="px-5 py-4 text-xs text-[#74777e]">Loading…</div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="px-5 py-4 text-xs text-[#74777e]">
                  {unassigned.length === 0 ? "All action items are already in this sprint." : "No items match your search."}
                </div>
              ) : (
                <ul className="divide-y divide-[#DCE3E8] max-h-64 overflow-y-auto">
                  {filteredUnassigned.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>{item.title}</p>
                        {item.milestone && (
                          <p className="text-[10px] text-[#74777e] mt-0.5 truncate uppercase tracking-wide">
                            {item.milestone.goal.title} / {item.milestone.title}
                          </p>
                        )}
                        {item.sprint && (
                          <p className="text-[10px] text-amber-600 mt-0.5">Currently in: {item.sprint.name}</p>
                        )}
                      </div>
                      <button
                        onClick={() => assignExisting(item)}
                        disabled={assigning === item.id}
                        className="shrink-0 rounded-md bg-[#00152a] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#102a43] disabled:opacity-60"
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
              <p className="text-sm text-[#74777e]">No action items yet.</p>
              <p className="text-xs text-[#74777e] mt-1">Add a new item or assign existing ones from your milestones.</p>
            </div>
          ) : (
            <div>
              {todo.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-slate-50 border-b border-[#DCE3E8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">To do ({todo.length})</span>
                  </div>
                  <ul className="divide-y divide-[#DCE3E8]">
                    {todo.map((item) => <ActionRow key={item.id} item={item} onToggle={toggleDone} onRemove={removeFromSprint} />)}
                  </ul>
                </div>
              )}
              {done.length > 0 && (
                <div>
                  <div className="px-5 py-2 bg-slate-50 border-b border-[#DCE3E8]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Done ({done.length})</span>
                  </div>
                  <ul className="divide-y divide-[#DCE3E8]">
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
