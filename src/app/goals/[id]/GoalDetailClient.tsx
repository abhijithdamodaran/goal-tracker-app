"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SmartResult } from "@/lib/smart-score";

interface Owner { id: string; name: string | null; image: string | null; email: string | null; }

interface CycleRef {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
}

interface ActionItemData {
  id: string;
  title: string;
  done: boolean;
  sprint: { id: string; name: string } | null;
}

interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  completedAt: string | null;
  cycleId: string;
  cycle: CycleRef;
  actionItems: ActionItemData[];
}

interface GoalData {
  id: string;
  title: string;
  description: string | null;
  metric: string | null;
  targetValue: number | null;
  unit: string | null;
  reflection: string | null;
  deadline: string | null;
  smartScore: number;
  workspaceType: string;
  workspaceId: string | null;
  ownerId: string;
  owner: Owner;
  createdAt: string;
}

interface Props { goal: GoalData; smart: SmartResult; isOwner: boolean; }

function ScoreBadge({ score }: { score: number }) {
  const colors = score >= 4 ? "bg-green-100 text-green-700" : score >= 2 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}>SMART {score}/5</span>;
}

const TYPE_COLORS: Record<string, string> = {
  monthly: "bg-blue-100 text-blue-700",
  quarterly: "bg-purple-100 text-purple-700",
  "half-yearly": "bg-orange-100 text-orange-700",
  yearly: "bg-green-100 text-green-700",
};

export default function GoalDetailClient({ goal, smart, isOwner }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  // Milestones
  const [milestones, setMilestones] = useState<MilestoneData[]>([]);
  const [milestonesLoading, setMilestonesLoading] = useState(true);

  // Add milestone form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newCycleId, setNewCycleId] = useState("");
  const [cycles, setCycles] = useState<CycleRef[]>([]);
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  // Add action item per milestone
  const [showAddItem, setShowAddItem] = useState<string | null>(null); // milestoneId
  const [newItemTitle, setNewItemTitle] = useState("");
  const [addItemLoading, setAddItemLoading] = useState(false);

  const loadMilestones = useCallback(async () => {
    try {
      const res = await fetch(`/api/goals/${goal.id}/milestones`);
      const data = await res.json();
      if (res.ok) setMilestones(data.milestones);
    } finally {
      setMilestonesLoading(false);
    }
  }, [goal.id]);

  useEffect(() => { loadMilestones(); }, [loadMilestones]);

  useEffect(() => {
    if (!showAddForm) return;
    fetch("/api/cycles").then(r => r.json()).then(d => {
      if (d.cycles) setCycles(d.cycles);
    }).catch(() => {});
  }, [showAddForm]);

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) { setAddError("Title is required."); return; }
    if (!newCycleId) { setAddError("Please select a cycle."); return; }
    setAddError("");
    setAddLoading(true);
    try {
      const res = await fetch(`/api/goals/${goal.id}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), description: newDescription.trim() || null, cycleId: newCycleId }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error ?? "Failed to add milestone."); return; }
      setMilestones((prev) => [...prev, data.milestone]);
      setNewTitle(""); setNewDescription(""); setNewCycleId(""); setShowAddForm(false);
    } catch { setAddError("Something went wrong."); }
    finally { setAddLoading(false); }
  }

  async function toggleComplete(m: MilestoneData) {
    const completedAt = m.completedAt ? null : new Date().toISOString();
    const res = await fetch(`/api/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completedAt }),
    });
    if (res.ok) {
      const data = await res.json();
      setMilestones((prev) => prev.map((x) => (x.id === m.id ? { ...x, completedAt: data.milestone.completedAt } : x)));
    }
  }

  async function deleteMilestone(id: string) {
    await fetch(`/api/milestones/${id}`, { method: "DELETE" });
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  async function handleAddActionItem(e: React.FormEvent, milestoneId: string) {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    setAddItemLoading(true);
    try {
      const res = await fetch("/api/action-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newItemTitle.trim(), milestoneId, workspaceType: goal.workspaceType, workspaceId: goal.workspaceId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMilestones((prev) => prev.map((m) => m.id === milestoneId ? { ...m, actionItems: [...m.actionItems, data.item] } : m));
        setNewItemTitle(""); setShowAddItem(null);
      }
    } finally { setAddItemLoading(false); }
  }

  async function toggleActionItem(milestoneId: string, itemId: string, done: boolean) {
    await fetch(`/api/action-items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    setMilestones((prev) => prev.map((m) => m.id === milestoneId
      ? { ...m, actionItems: m.actionItems.map((a) => a.id === itemId ? { ...a, done } : a) }
      : m
    ));
  }

  async function deleteActionItem(milestoneId: string, itemId: string) {
    await fetch(`/api/action-items/${itemId}`, { method: "DELETE" });
    setMilestones((prev) => prev.map((m) => m.id === milestoneId
      ? { ...m, actionItems: m.actionItems.filter((a) => a.id !== itemId) }
      : m
    ));
  }

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      router.push("/dashboard");
    } finally { setArchiving(false); }
  }

  // Group milestones by cycle
  const byCycle = new Map<string, { cycle: CycleRef; milestones: MilestoneData[] }>();
  for (const m of milestones) {
    if (!byCycle.has(m.cycleId)) byCycle.set(m.cycleId, { cycle: m.cycle, milestones: [] });
    byCycle.get(m.cycleId)!.milestones.push(m);
  }

  const completedCount = milestones.filter((m) => m.completedAt).length;

  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const deadlineStr = deadlineDate ? deadlineDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }) : null;
  const isPastDeadline = deadlineDate ? deadlineDate < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/goals" className="hover:text-gray-700">Goals</Link>
            <span className="text-gray-300">/</span>
            <span className="truncate max-w-48">{goal.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={goal.smartScore} />
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${goal.workspaceType === "family" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
              {goal.workspaceType}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Title + meta */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{goal.title}</h1>
            <Link href={`/goals/${goal.id}/edit`} className="shrink-0 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Edit</Link>
          </div>
          {goal.description && <p className="text-gray-600 text-sm leading-relaxed">{goal.description}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-gray-500">
            <span>By {goal.owner.name ?? goal.owner.email}</span>
            {deadlineStr && (
              <span className={`font-medium ${isPastDeadline ? "text-red-600" : "text-gray-700"}`}>
                {isPastDeadline ? "Overdue — " : "Due "}{deadlineStr}
              </span>
            )}
          </div>
        </div>

        {/* SMART breakdown */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">SMART analysis</h2>
            <ScoreBadge score={goal.smartScore} />
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100">
            <div className={`h-2 rounded-full transition-all ${goal.smartScore >= 4 ? "bg-green-500" : goal.smartScore >= 2 ? "bg-yellow-400" : "bg-gray-300"}`} style={{ width: `${(goal.smartScore / 5) * 100}%` }} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {smart.dimensions.map((dim) => (
              <div key={dim.key} className={`rounded-xl p-3 text-center ${dim.met ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
                <div className={`text-lg font-bold ${dim.met ? "text-green-600" : "text-gray-300"}`}>{dim.key}</div>
                <div className={`text-xs font-medium ${dim.met ? "text-green-700" : "text-gray-500"}`}>{dim.label}</div>
                {!dim.met && <p className="mt-1 text-xs text-gray-400 leading-tight">{dim.hint}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Measurable details */}
        {(goal.metric || goal.targetValue != null || goal.unit) && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-3">Success metric</h2>
            <div className="flex items-baseline gap-2">
              {goal.metric && <span className="text-gray-700 text-sm">{goal.metric}</span>}
              {goal.targetValue != null && <span className="text-3xl font-bold text-blue-700">{goal.targetValue}</span>}
              {goal.unit && <span className="text-gray-500 text-sm">{goal.unit}</span>}
            </div>
          </div>
        )}

        {/* Reflection */}
        {goal.reflection && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-2">Why this goal</h2>
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{goal.reflection}</p>
          </div>
        )}

        {/* Milestones */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Milestones</h2>
              {milestones.length > 0 && (
                <span className="text-xs text-gray-400">{completedCount}/{milestones.length} done</span>
              )}
            </div>
            <button
              onClick={() => setShowAddForm((v) => !v)}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {showAddForm ? "Cancel" : "+ Add milestone"}
            </button>
          </div>

          {/* Add form */}
          {showAddForm && (
            <form onSubmit={handleAddMilestone} className="px-6 py-4 bg-blue-50 border-b border-gray-100 space-y-3">
              {addError && <p role="alert" className="text-xs text-red-600">{addError}</p>}
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => { setNewTitle(e.target.value); if (addError) setAddError(""); }}
                placeholder="Milestone title"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Description (optional)"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <select
                  value={newCycleId}
                  onChange={(e) => { setNewCycleId(e.target.value); if (addError) setAddError(""); }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a cycle…</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <Link href="/cycles/new" target="_blank" className="text-xs text-blue-600 hover:underline shrink-0">+ New cycle</Link>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={addLoading} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {addLoading ? "Adding…" : "Add"}
                </button>
                <button type="button" onClick={() => { setShowAddForm(false); setAddError(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          )}

          {milestonesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-gray-500">No milestones yet.</p>
              <p className="text-xs text-gray-400 mt-1">Break this goal into intermediate targets, each assigned to a cycle.</p>
            </div>
          ) : (
            Array.from(byCycle.values()).map(({ cycle, milestones: ms }) => (
              <div key={cycle.id}>
                <div className="flex items-center gap-2 px-6 py-2 bg-gray-50 border-b border-gray-100">
                  <Link href={`/cycles/${cycle.id}`} className="text-xs font-semibold text-gray-600 hover:underline">{cycle.name}</Link>
                  <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${TYPE_COLORS[cycle.type] ?? "bg-gray-100 text-gray-600"}`}>
                    {cycle.type}
                  </span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {ms.map((m) => (
                    <li key={m.id} className="px-6 py-3">
                      <div className="flex items-center gap-3 group">
                        <button
                          onClick={() => toggleComplete(m)}
                          className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition ${
                            m.completedAt ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"
                          }`}
                          title={m.completedAt ? "Mark incomplete" : "Mark complete"}
                        >
                          {m.completedAt && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${m.completedAt ? "text-gray-400 line-through" : "text-gray-800"}`}>{m.title}</p>
                          {m.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{m.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => { setShowAddItem(showAddItem === m.id ? null : m.id); setNewItemTitle(""); }} className="text-xs font-medium text-blue-500 hover:text-blue-700">+ Task</button>
                          <button onClick={() => deleteMilestone(m.id)} className="text-gray-400 hover:text-red-500" title="Delete milestone">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                      {/* Action items under this milestone */}
                      {m.actionItems.length > 0 && (
                        <ul className="mt-2 ml-8 space-y-1">
                          {m.actionItems.map((item) => (
                            <li key={item.id} className="flex items-center gap-2 group/item">
                              <button
                                onClick={() => toggleActionItem(m.id, item.id, !item.done)}
                                className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition ${item.done ? "border-green-500 bg-green-500" : "border-gray-300 hover:border-green-400"}`}
                              >
                                {item.done && <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                              </button>
                              <span className={`flex-1 text-xs ${item.done ? "text-gray-400 line-through" : "text-gray-700"}`}>{item.title}</span>
                              {item.sprint && <span className="text-xs text-blue-400 truncate max-w-20">{item.sprint.name}</span>}
                              <button onClick={() => deleteActionItem(m.id, item.id)} className="opacity-0 group-hover/item:opacity-100 text-gray-300 hover:text-red-500 transition">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      {/* Add task inline form */}
                      {showAddItem === m.id && (
                        <form onSubmit={(e) => handleAddActionItem(e, m.id)} className="mt-2 ml-8 flex items-center gap-2">
                          <input
                            autoFocus
                            value={newItemTitle}
                            onChange={(e) => setNewItemTitle(e.target.value)}
                            placeholder="Task title…"
                            className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                          <button type="submit" disabled={addItemLoading} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                            {addItemLoading ? "…" : "Add"}
                          </button>
                          <button type="button" onClick={() => setShowAddItem(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>

        {/* Danger zone */}
        {isOwner && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-semibold text-red-700 text-sm">Danger zone</h2>
            {!archiveConfirm ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">Archive this goal</p>
                <button onClick={() => setArchiveConfirm(true)} className="text-sm font-medium text-red-600 hover:text-red-700">Archive</button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Archive <strong>{goal.title}</strong>? You can restore it later.</p>
                <div className="flex gap-2">
                  <button onClick={handleArchive} disabled={archiving} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                    {archiving ? "Archiving…" : "Yes, archive"}
                  </button>
                  <button onClick={() => setArchiveConfirm(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
