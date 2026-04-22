"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Status = "valid" | "not_found" | "used" | "expired" | "already_member";

interface Props {
  status: Status;
  code: string;
  workspaceName: string | null;
}

export default function InviteAcceptClient({ status, code, workspaceName }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  async function handleAccept() {
    setIsPending(true);
    setError("");
    try {
      const res = await fetch("/api/family/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to join. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center space-y-6">
        {status === "valid" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100">
              <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">You&apos;ve been invited!</h1>
              <p className="text-gray-600">
                Join the <span className="font-semibold text-gray-900">{workspaceName}</span> family workspace to share goals and habits.
              </p>
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button
              onClick={handleAccept}
              disabled={isPending}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "Joining…" : `Join ${workspaceName}`}
            </button>
            <button onClick={() => router.push("/dashboard")} className="text-sm text-gray-500 hover:text-gray-700">
              Maybe later
            </button>
          </>
        )}

        {status === "already_member" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">Already a member</h1>
              <p className="text-gray-600">You&apos;re already in the <span className="font-semibold text-gray-900">{workspaceName}</span> family workspace.</p>
            </div>
            <button onClick={() => router.push("/dashboard")} className="w-full inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Go to dashboard
            </button>
          </>
        )}

        {(status === "not_found" || status === "used" || status === "expired") && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {status === "not_found" ? "Invite not found" : status === "used" ? "Invite already used" : "Invite expired"}
              </h1>
              <p className="text-gray-600">
                {status === "not_found"
                  ? "This invite link is invalid. Ask your partner to generate a new one."
                  : status === "used"
                  ? "This invite code has already been redeemed. Ask your partner to generate a new one."
                  : "This invite link has expired. Ask your partner to generate a fresh code."}
              </p>
            </div>
            <button onClick={() => router.push("/dashboard")} className="w-full inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800">
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
