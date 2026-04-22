"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FamilyCreatePage() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const res = await fetch("/api/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName: familyName.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create family workspace.");
        return;
      }

      // Auto-generate first invite code
      const invRes = await fetch("/api/family/invite", { method: "POST" });
      const invData = await invRes.json();
      if (invRes.ok) {
        setInviteCode(invData.code);
      } else {
        // Created fine but invite generation failed — go to dashboard
        router.push("/dashboard");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );

  if (inviteCode) {
    return (
      <Shell><div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Family workspace created!</h2>
          <p className="text-gray-600">Share this invite code with your partner so they can join.</p>
        </div>
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-6">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mb-2">Invite Code</p>
          <p className="text-4xl font-mono font-bold tracking-widest text-blue-800">{inviteCode}</p>
          <p className="mt-2 text-xs text-blue-500">Valid for 7 days · Single use</p>
        </div>
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Go to dashboard
        </button>
      </div></Shell>
    );
  }

  return (
    <Shell><div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Create a family workspace</h1>
        <p className="text-gray-600">Give your shared space a name — you can invite your partner after.</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-4">
        <div>
          <label htmlFor="family-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Family name
          </label>
          <input
            id="family-name"
            type="text"
            autoFocus
            value={familyName}
            onChange={(e) => { setFamilyName(e.target.value); if (error) setError(""); }}
            placeholder="e.g. The Smiths"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "name-error" : undefined}
            className={`block w-full rounded-xl border px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {error && (
            <p id="name-error" role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={isPending || !familyName.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Creating…" : "Create workspace"}
          </button>
        </div>
      </form>
    </div></Shell>
  );
}
