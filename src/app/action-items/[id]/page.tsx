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

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editError, setEditError] = useState("");

  // Sprint assignment
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
    </div>
  );
  if (!item) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/action-items" className="hover:text-gray-700">Action Items</Link>
            {item.milestone && (
              <>
                <span>/</span>
                <Link href={`/milestones/${item.milestone.id}`} className="hover:text-gray-700 truncate max-w-32">{item.milestone.title}</Link>
              </>
            )}
          </div>
          <button
            onClick={toggleDone}
            disabled={saving}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
              item.done
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {saving ? "…" : item.done ? "✓ Done" : "Mark done"}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {/* Main card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {editing ? (
            <form onSubmit={saveEdits} className="space-y-4">
              {editError && <p className="text-xs text-red-600">{editError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => { setEditTitle(e.target.value); if (editError) setEditError(""); }}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Due date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  className="block rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button type="button" onClick={() => { setEditing(false); setEditError(""); }} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className={`text-2xl font-bold ${item.done ? "text-gray-400 line-through" : "text-gray-900"}`}>{item.title}</h1>
                <button onClick={() => setEditing(true)} className="shrink-0 text-sm text-gray-500 hover:text-gray-700">Edit</button>
              </div>
              {item.description && <p className="text-sm text-gray-600 mt-2">{item.description}</p>}
              {item.dueDate && (
                <p className={`text-sm mt-2 ${new Date(item.dueDate) < new Date() && !item.done ? "text-red-600 font-medium" : "text-gray-500"}`}>
                  Due {new Date(item.dueDate).toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Context */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Context</h2>
          <div className="space-y-2 text-sm">
            {item.milestone ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Goal</span>
                  <Link href={`/goals/${item.milestone.goal.id}`} className="font-medium text-blue-600 hover:underline truncate">{item.milestone.goal.title}</Link>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-20 shrink-0">Milestone</span>
                  <Link href={`/milestones/${item.milestone.id}`} className="font-medium text-blue-600 hover:underline truncate">{item.milestone.title}</Link>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-xs">Not linked to a milestone.</p>
            )}
          </div>
        </div>

        {/* Sprint assignment */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Sprint</h2>
            <button
              onClick={() => {
                setShowSprintPicker((v) => !v);
                if (!showSprintPicker && sprints.length === 0) loadSprints();
              }}
              className="text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              {showSprintPicker ? "Cancel" : item.sprint ? "Change" : "Assign"}
            </button>
          </div>
          {item.sprint ? (
            <div className="flex items-center justify-between">
              <Link href={`/sprints/${item.sprint.id}`} className="text-sm font-medium text-blue-600 hover:underline">{item.sprint.name}</Link>
              <button
                onClick={() => assignSprint(null)}
                disabled={saving}
                className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Not assigned to a sprint.</p>
          )}
          {showSprintPicker && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {sprintLoading ? (
                <div className="px-4 py-3 text-xs text-gray-400">Loading…</div>
              ) : sprints.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400">No sprints found. <Link href="/sprints/new" className="text-blue-600 hover:underline">Create one →</Link></div>
              ) : (
                <ul className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {sprints.map((s) => {
                    const isActive = item.sprint?.id === s.id;
                    const now = new Date();
                    const isCurrent = new Date(s.startDate) <= now && new Date(s.endDate) >= now;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => assignSprint(s.id)}
                          disabled={saving}
                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between disabled:opacity-60 ${isActive ? "bg-blue-50" : ""}`}
                        >
                          <span className={isActive ? "text-blue-700 font-medium" : "text-gray-800"}>{s.name}</span>
                          <div className="flex items-center gap-2">
                            {isCurrent && <span className="text-xs text-blue-600">Current</span>}
                            {isActive && <span className="text-xs text-green-600">Assigned</span>}
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
        <div className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-red-700 mb-3">Danger zone</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">Delete this action item</p>
            <button onClick={handleDelete} disabled={deleting} className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60">
              {deleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
