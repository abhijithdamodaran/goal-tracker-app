"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeSmartScore, SmartDimension } from "@/lib/smart-score";

interface Workspace {
  id: string;
  name: string;
}

function SmartBadge({ score }: { score: number }) {
  const colors =
    score >= 4 ? "bg-green-100 text-green-700" :
    score >= 2 ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}>
      SMART {score}/5
    </span>
  );
}

function DimensionRow({ dim }: { dim: SmartDimension }) {
  return (
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        dim.met ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
      }`}>
        {dim.key}
      </div>
      <div>
        <span className={`text-sm font-medium ${dim.met ? "text-green-700" : "text-gray-700"}`}>
          {dim.label}
        </span>
        {!dim.met && <p className="text-xs text-gray-400 mt-0.5">{dim.hint}</p>}
      </div>
    </div>
  );
}

export default function NewGoalPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [metric, setMetric] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("");
  const [reflection, setReflection] = useState("");
  const [deadline, setDeadline] = useState("");
  const [workspaceType, setWorkspaceType] = useState<"personal" | "family">("personal");
  const [familyWorkspace, setFamilyWorkspace] = useState<Workspace | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.familyWorkspace) setFamilyWorkspace(d.familyWorkspace);
      })
      .catch(() => {});
  }, []);

  const smart = useMemo(
    () =>
      computeSmartScore({
        title,
        description,
        metric,
        targetValue: targetValue !== "" ? parseFloat(targetValue) : undefined,
        unit,
        reflection,
        deadline: deadline || null,
      }),
    [title, description, metric, targetValue, unit, reflection, deadline]
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required."); return; }
    setError("");
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        metric: metric.trim() || undefined,
        targetValue: targetValue !== "" ? parseFloat(targetValue) : undefined,
        unit: unit.trim() || undefined,
        reflection: reflection.trim() || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        workspaceType,
        workspaceId: workspaceType === "family" ? familyWorkspace?.id : undefined,
      };
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create goal."); return; }
      router.push(`/goals/${data.goal.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <h1 className="text-base font-semibold text-gray-900">New Goal</h1>
          </div>
          <SmartBadge score={smart.score} />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
            {error && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Specific */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">S</span>
                <h2 className="font-semibold text-gray-900">Specific</h2>
              </div>
              <div>
                <label htmlFor="title" className={labelClass}>Goal title <span className="text-red-500">*</span></label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Run a half marathon in under 2 hours"
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className={labelClass}>Description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Why this goal? What does success look like?"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
            </section>

            {/* Measurable */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">M</span>
                <h2 className="font-semibold text-gray-900">Measurable</h2>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-3 sm:col-span-1">
                  <label htmlFor="metric" className={labelClass}>Metric</label>
                  <input
                    id="metric"
                    value={metric}
                    onChange={(e) => setMetric(e.target.value)}
                    placeholder="e.g. Run"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="targetValue" className={labelClass}>Target</label>
                  <input
                    id="targetValue"
                    type="number"
                    step="any"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="5"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="unit" className={labelClass}>Unit</label>
                  <input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="km"
                    className={inputClass}
                  />
                </div>
              </div>
            </section>

            {/* Achievable + Relevant */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">A</span>
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">R</span>
                <h2 className="font-semibold text-gray-900">Achievable &amp; Relevant</h2>
              </div>
              <div>
                <label htmlFor="reflection" className={labelClass}>Why is this goal achievable and relevant to you?</label>
                <textarea
                  id="reflection"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Explain why this goal is within reach and why it matters to you right now..."
                  rows={4}
                  className={`${inputClass} resize-none`}
                />
                <p className="mt-1 text-xs text-gray-400">{reflection.trim().length} characters</p>
              </div>
            </section>

            {/* Time-bound */}
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">T</span>
                <h2 className="font-semibold text-gray-900">Time-bound</h2>
              </div>
              <div>
                <label htmlFor="deadline" className={labelClass}>Target deadline</label>
                <input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className={inputClass}
                />
              </div>
            </section>

            {/* Ownership */}
            {familyWorkspace && (
              <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
                <h2 className="font-semibold text-gray-900">Ownership</h2>
                <div className="flex gap-3">
                  {(["personal", "family"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkspaceType(type)}
                      className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition ${
                        workspaceType === type
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {type === "personal" ? "Personal" : `Family — ${familyWorkspace.name}`}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <div className="flex items-center gap-3 pb-8">
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                {submitting ? "Saving…" : "Create goal"}
              </button>
              <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">
                Cancel
              </Link>
            </div>
          </form>

          {/* SMART score sidebar */}
          <aside className="space-y-4">
            <div className="sticky top-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">SMART score</h3>
                <SmartBadge score={smart.score} />
              </div>

              {/* Score bar */}
              <div className="space-y-1">
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      smart.score >= 4 ? "bg-green-500" :
                      smart.score >= 2 ? "bg-yellow-400" :
                      "bg-gray-300"
                    }`}
                    style={{ width: `${(smart.score / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400">
                  {smart.score === 5
                    ? "Excellent SMART goal!"
                    : smart.score >= 4
                    ? "Strong goal — almost there."
                    : smart.score >= 2
                    ? "Good start — fill in more details."
                    : "Keep going — add more details."}
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {smart.dimensions.map((dim) => (
                  <DimensionRow key={dim.key} dim={dim} />
                ))}
              </div>

              <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
                Scoring is advisory only — you can save at any time.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
