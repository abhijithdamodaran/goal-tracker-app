"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SmartResult } from "@/lib/smart-score";

interface Owner {
  id: string;
  name: string | null;
  image: string | null;
  email: string | null;
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

interface Props {
  goal: GoalData;
  smart: SmartResult;
  isOwner: boolean;
}

function ScoreBadge({ score }: { score: number }) {
  const colors =
    score >= 4 ? "bg-green-100 text-green-700" :
    score >= 2 ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${colors}`}>
      SMART {score}/5
    </span>
  );
}

export default function GoalDetailClient({ goal, smart, isOwner }: Props) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);

  async function handleArchive() {
    setArchiving(true);
    try {
      await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      router.push("/dashboard");
    } finally {
      setArchiving(false);
    }
  }

  const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
  const deadlineStr = deadlineDate
    ? deadlineDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : null;

  const isPastDeadline = deadlineDate ? deadlineDate < new Date() : false;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-500">Goals</span>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={goal.smartScore} />
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              goal.workspaceType === "family" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
            }`}>
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
            <Link
              href={`/goals/${goal.id}/edit`}
              className="shrink-0 rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Edit
            </Link>
          </div>
          {goal.description && (
            <p className="text-gray-600 text-sm leading-relaxed">{goal.description}</p>
          )}
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
            <div
              className={`h-2 rounded-full transition-all ${
                goal.smartScore >= 4 ? "bg-green-500" :
                goal.smartScore >= 2 ? "bg-yellow-400" : "bg-gray-300"
              }`}
              style={{ width: `${(goal.smartScore / 5) * 100}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
            {smart.dimensions.map((dim) => (
              <div
                key={dim.key}
                className={`rounded-xl p-3 text-center ${
                  dim.met ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className={`text-lg font-bold ${dim.met ? "text-green-600" : "text-gray-300"}`}>
                  {dim.key}
                </div>
                <div className={`text-xs font-medium ${dim.met ? "text-green-700" : "text-gray-500"}`}>
                  {dim.label}
                </div>
                {!dim.met && (
                  <p className="mt-1 text-xs text-gray-400 leading-tight">{dim.hint}</p>
                )}
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
              {goal.targetValue != null && (
                <span className="text-3xl font-bold text-blue-700">{goal.targetValue}</span>
              )}
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

        {/* Coming soon: milestones / habits */}
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-center space-y-1">
          <p className="text-sm font-medium text-gray-500">Milestones &amp; habits</p>
          <p className="text-xs text-gray-400">Coming in Phase 4 &amp; 6.</p>
        </div>

        {/* Danger zone */}
        {isOwner && (
          <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-3">
            <h2 className="font-semibold text-red-700 text-sm">Danger zone</h2>
            {!archiveConfirm ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">Archive this goal</p>
                <button
                  onClick={() => setArchiveConfirm(true)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Archive
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-700">Archive <strong>{goal.title}</strong>? You can restore it later.</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleArchive}
                    disabled={archiving}
                    className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {archiving ? "Archiving…" : "Yes, archive"}
                  </button>
                  <button
                    onClick={() => setArchiveConfirm(false)}
                    className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
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
