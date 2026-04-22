"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Workspace { id: string; name: string; }

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function NewSprintForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillDate = searchParams.get("date");

  const today = new Date();
  const defaultMonday = prefillDate ? getMonday(new Date(prefillDate)) : getMonday(today);

  const [weekStart, setWeekStart] = useState(defaultMonday.toISOString().slice(0, 10));
  const [workspaceType, setWorkspaceType] = useState<"personal" | "family">("personal");
  const [familyWorkspace, setFamilyWorkspace] = useState<Workspace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(d => {
      if (d.familyWorkspace) setFamilyWorkspace(d.familyWorkspace);
    }).catch(() => {});
  }, []);

  const monday = getMonday(new Date(weekStart + "T12:00:00"));
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: monday.toISOString(),
          workspaceType,
          workspaceId: workspaceType === "family" ? familyWorkspace?.id : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create sprint."); return; }
      router.push(`/sprints/${data.sprint.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/sprints" className="text-sm text-gray-500 hover:text-gray-700">← Sprints</Link>
          <h1 className="text-base font-semibold text-gray-900">New Sprint</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Select week</h2>
            <div>
              <label htmlFor="weekStart" className="block text-sm font-medium text-gray-700 mb-1">Any day in the week</label>
              <input id="weekStart" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} className={inputClass} />
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
              Sprint: <strong>
                {monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                {" — "}
                {sunday.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </strong>
            </div>
          </section>

          {familyWorkspace && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="font-semibold text-gray-900">Ownership</h2>
              <div className="flex gap-3">
                {(["personal", "family"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setWorkspaceType(t)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${workspaceType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    {t === "personal" ? "Personal" : `Family — ${familyWorkspace.name}`}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center gap-3 pb-8">
            <button type="submit" disabled={submitting} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
              {submitting ? "Creating…" : "Start sprint"}
            </button>
            <Link href="/sprints" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewSprintPage() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>}>
      <NewSprintForm />
    </Suspense>
  );
}
