"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { HabitForm } from "@/components/habits/HabitForm";
import type { CreateHabitInput } from "@/lib/types/habit";

export default function NewHabitPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(data: CreateHabitInput) {
    setIsSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          streakMode: data.streakMode,
          percentageThreshold: data.percentageThreshold ?? 0.8,
          scheduledDays: data.scheduledDays ?? [0, 1, 2, 3, 4, 5, 6],
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Failed to create habit."); return; }
      router.push("/habits");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href="/habits" className="text-sm text-gray-500 hover:text-gray-700">← Habits</Link>
          <h1 className="text-base font-semibold text-gray-900">New Habit</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          {error && (
            <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <HabitForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Create habit"
          />
        </div>
      </main>
    </div>
  );
}
