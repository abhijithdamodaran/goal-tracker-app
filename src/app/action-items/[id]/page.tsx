"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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

interface SprintOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export default function ActionItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [item, setItem] = useState<ActionItemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editError, setEditError] = useState("");

  const [sprints, setSprints] = useState<SprintOption[]>([]);
  const [showSprintPicker, setShowSprintPicker] = useState(false);
  const [sprintLoading, setSprintLoading] = useState(false);

  const loadItem = useCallback(async () => {
    const res = await fetch(`/api/action-items/${id}`);
    if (!res.ok) { router.push("/action-items"); return; }
    const data = await res.json();
    const found = data.item;
    setItem(found);
    setEditTitle(found.title);
    setEditDesc(found.description ?? "");
    setEditDueDate(found.dueDate ? found.dueDate.slice(0, 10) : "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => { loadItem(); }, [loadItem]);

  async function loadSprints() {
    setSprintLoading(true);
    const res = await fetch("/api/sprints");
    const data = res.ok ? await res.json() : { sprints: [] };
    setSprints(data.sprints ?? []);
    setSprintLoading(false);
  }

  async function toggleDone() {
    if (!item || saving) return;
    setSaving(true);
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !item.done }),
    });
    if (res.ok) {
      const data = await res.json();
      setItem((prev) => prev ? { ...prev, done: data.item.done } : prev);
    }
    setSaving(false);
  }

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    if (!editTitle.trim()) { setEditError("Title is required."); return; }
    setEditError("");
    setSaving(true);
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setItem((prev) => prev ? { ...prev, ...data.item } : prev);
      setEditing(false);
    } else {
      setEditError("Failed to save.");
    }
    setSaving(false);
  }

  async function assignSprint(sprintId: string | null) {
    setSaving(true);
    const res = await fetch(`/api/action-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sprintId }),
    });
    if (res.ok) {
      const data = await res.json();
      setItem((prev) => prev ? { ...prev, sprint: data.item.sprint } : prev);
    }
    setShowSprintPicker(false);
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this action item?")) return;
    setDeleting(true);
    await fetch(`/api/action-items/${id}`, { method: "DELETE" });
    router.push(item?.milestone ? `/milestones/${item.milestone.id}` : "/action-items");
  }

  if (loading) return (
    <div className="min-h-screen bg-[#f6fafe] flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#00152a] border-t-transparent" />
    </div>
  );
  if (!item) return null;

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#74777e]">
          <Link href="/action-items" className="hover:text-[#43474d]">Action Items</Link>
          {item.milestone && (
            <>
              <span className="text-[#DCE3E8]">/</span>
              <Link href={`/milestones/${item.milestone.id}`} className="hover:text-[#43474d] truncate max-w-32">{item.milestone.title}</Link>
            </>
          )}
        </div>
        <button
          onClick={toggleDone}
          disabled={saving}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60 ${
            item.done
              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
              : "bg-[#00152a] text-white hover:bg-[#102a43]"
          }`}
        >
          {saving ? "…" : item.done ? "✓ Done" : "Mark done"}
        </button>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-4">
        {/* Main card */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-6">
          {editing ? (
            <form onSubmit={saveEdits} className="space-y-4">
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-1.5">Title</label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); if (editError) setEditError(""); }}
                  className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2 text-sm focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-1.5">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2 text-sm focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a] resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-1.5">Due date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="block rounded-md border border-[#DCE3E8] px-3 py-2 text-sm focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="rounded-md bg-[#00152a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#102a43] disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => { setEditing(false); setEditError(""); }} className="rounded-md border border-[#DCE3E8] px-4 py-2 text-xs text-[#43474d] hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className={`text-2xl font-semibold tracking-tight ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>{item.title}</h1>
                <button onClick={() => setEditing(true)} className="shrink-0 text-xs font-medium text-[#43474d] hover:text-[#171c1f] border border-[#DCE3E8] px-2.5 py-1 rounded-md hover:bg-slate-50">Edit</button>
              </div>
              {item.description && <p className="text-sm text-[#43474d] mt-2">{item.description}</p>}
              {item.dueDate && (
                <p className={`text-sm mt-2 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-600 font-medium" : "text-[#74777e]"}`}>
                  Due {new Date(item.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Context */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-5 space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Context</h2>
          <div className="space-y-2 text-sm">
            {item.milestone ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#74777e] w-20 shrink-0">Goal</span>
                  <Link href={`/goals/${item.milestone.goal.id}`} className="font-medium text-[#00152a] hover:underline truncate">{item.milestone.goal.title}</Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#74777e] w-20 shrink-0">Milestone</span>
                  <Link href={`/milestones/${item.milestone.id}`} className="font-medium text-[#00152a] hover:underline truncate">{item.milestone.title}</Link>
                </div>
              </>
            ) : (
              <p className="text-[#74777e] text-xs">Not linked to a milestone.</p>
            )}
          </div>
        </div>

        {/* Sprint assignment */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Sprint</h2>
            <button
              onClick={() => {
                setShowSprintPicker((v) => !v);
                if (!showSprintPicker && sprints.length === 0) loadSprints();
              }}
              className="text-xs font-medium text-[#00152a] hover:underline"
            >
              {showSprintPicker ? "Cancel" : item.sprint ? "Change" : "Assign"}
            </button>
          </div>
          {item.sprint ? (
            <div className="flex items-center justify-between">
              <Link href={`/sprints/${item.sprint.id}`} className="text-sm font-medium text-[#00152a] hover:underline">{item.sprint.name}</Link>
              <button
                onClick={() => assignSprint(null)}
                disabled={saving}
                className="text-xs text-[#74777e] hover:text-red-500 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-sm text-[#74777e]">Not assigned to a sprint.</p>
          )}
          {showSprintPicker && (
            <div className="border border-[#DCE3E8] rounded-md overflow-hidden">
              {sprintLoading ? (
                <div className="px-4 py-3 text-xs text-[#74777e]">Loading…</div>
              ) : sprints.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[#74777e]">No sprints found. <Link href="/sprints/new" className="text-[#00152a] hover:underline">Create one →</Link></div>
              ) : (
                <ul className="divide-y divide-[#DCE3E8] max-h-48 overflow-y-auto">
                  {sprints.map((s) => {
                    const isActive = item.sprint?.id === s.id;
                    const now = new Date();
                    const isCurrent = new Date(s.startDate) <= now && new Date(s.endDate) >= now;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => assignSprint(s.id)}
                          disabled={saving}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 flex items-center justify-between disabled:opacity-60 ${isActive ? "bg-slate-100" : ""}`}
                        >
                          <span className={isActive ? "text-[#171c1f] font-medium" : "text-[#43474d]"}>{s.name}</span>
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="text-[10px] font-bold uppercase tracking-wide text-[#00152a]">Current</span>}
                            {isActive && <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Assigned</span>}
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Danger */}
        <div className="rounded-lg border border-red-200 bg-white p-5">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-3">Danger zone</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#43474d]">Delete this action item</p>
            <button onClick={handleDelete} disabled={deleting} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
