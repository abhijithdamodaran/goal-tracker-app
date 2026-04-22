"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FamilyJoinPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsPending(true);

    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to join family workspace.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4 py-16">
    <div className="w-full max-w-md">
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold text-gray-900">Join a family workspace</h1>
        <p className="text-gray-600">Enter the 8-character invite code your partner shared with you.</p>
      </div>

      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label htmlFor="invite-code" className="block text-sm font-medium text-gray-700 mb-1.5">
            Invite code
          </label>
          <input
            id="invite-code"
            type="text"
            autoFocus
            autoComplete="off"
            maxLength={8}
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); if (error) setError(""); }}
            placeholder="e.g. A1B2C3D4"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "code-error" : undefined}
            className={`block w-full rounded-xl border px-4 py-3 font-mono text-xl tracking-widest text-center text-gray-900 placeholder-gray-300 shadow-sm focus:outline-none focus:ring-2 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {error && (
            <p id="code-error" role="alert" className="mt-1.5 text-sm text-red-600">{error}</p>
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
            disabled={isPending || code.trim().length < 8}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isPending ? "Joining…" : "Join workspace"}
          </button>
        </div>
      </form>
    </div>
    </div>
    </div>
  );
}
