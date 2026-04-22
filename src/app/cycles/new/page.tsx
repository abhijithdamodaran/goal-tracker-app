"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const CYCLE_TYPES = [
  { value: "monthly", label: "Monthly", duration: "~1 month", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "quarterly", label: "Quarterly", duration: "~3 months", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { value: "half-yearly", label: "Half-yearly", duration: "~6 months", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { value: "yearly", label: "Yearly", duration: "~12 months", color: "bg-green-50 border-green-200 text-green-700" },
] as const;

interface Workspace { id: string; name: string; }

function autoEndDate(start: string, type: string): string {
  if (!start) return "";
  const d = new Date(start);
  if (type === "monthly") d.setMonth(d.getMonth() + 1);
  else if (type === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (type === "half-yearly") d.setMonth(d.getMonth() + 6);
  else if (type === "yearly") d.setFullYear(d.getFullYear() + 1);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export default function NewCyclePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState<"monthly" | "quarterly" | "half-yearly" | "yearly">("quarterly");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => autoEndDate(new Date().toISOString().slice(0, 10), "quarterly"));
  const [workspaceType, setWorkspaceType] = useState<"personal" | "family">("personal");
  const [familyWorkspace, setFamilyWorkspace] = useState<Workspace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/me").then(r => r.json()).then(d => {
      if (d.familyWorkspace) setFamilyWorkspace(d.familyWorkspace);
    }).catch(() => {});
  }, []);

  function handleTypeChange(t: typeof type) {
    setType(t);
    if (startDate) setEndDate(autoEndDate(startDate, t));
  }

  function handleStartChange(val: string) {
    setStartDate(val);
    if (val) setEndDate(autoEndDate(val, type));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required."); return; }
    if (!startDate || !endDate) { setError("Start and end dates are required."); return; }
    if (new Date(startDate) >= new Date(endDate)) { setError("End date must be after start date."); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          workspaceType,
          workspaceId: workspaceType === "family" ? familyWorkspace?.id : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create cycle."); return; }
      router.push(`/cycles/${data.cycle.id}`);
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/cycles" className="text-sm text-gray-500 hover:text-gray-700">← Cycles</Link>
          <h1 className="text-base font-semibold text-gray-900">New Cycle</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Cycle type */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Cycle type</h2>
            <div className="grid grid-cols-2 gap-3">
              {CYCLE_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => handleTypeChange(ct.value)}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    type === ct.value ? ct.color + " border-current" : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="font-semibold text-sm">{ct.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ct.duration}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Name + dates */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Details</h2>
            <div>
              <label htmlFor="name" className={labelClass}>Cycle name <span className="text-red-500">*</span></label>
              <input
                id="name"
                value={name}
                onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
                placeholder={`e.g. Q2 2026, Jan 2026, H1 2026`}
                className={inputClass}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className={labelClass}>Start date</label>
                <input id="startDate" type="date" value={startDate} onChange={(e) => handleStartChange(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="endDate" className={labelClass}>End date</label>
                <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} min={startDate} className={inputClass} />
              </div>
            </div>
          </section>

          {/* Ownership */}
          {familyWorkspace && (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="font-semibold text-gray-900">Ownership</h2>
              <div className="flex gap-3">
                {(["personal", "family"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setWorkspaceType(t)}
                    className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                      workspaceType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}>
                    {t === "personal" ? "Personal" : `Family — ${familyWorkspace.name}`}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="flex items-center gap-3 pb-8">
            <button type="submit" disabled={submitting || !name.trim()} className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60">
              {submitting ? "Creating…" : "Create cycle"}
            </button>
            <Link href="/cycles" className="text-sm text-gray-500 hover:text-gray-700">Cancel</Link>
          </div>
        </form>
      </main>
    </div>
  );
}
