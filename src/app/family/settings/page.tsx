"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface Member {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface Workspace {
  id: string;
  name: string;
  role: string;
  members: Member[];
}

function Avatar({ member }: { member: Member }) {
  const label = member.name ?? member.email ?? "?";
  if (member.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={member.image} alt={label} className="h-9 w-9 rounded-full object-cover" />;
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

export default function FamilySettingsPage() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Rename state
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Leave state
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const fetchWorkspace = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      const data = await res.json();
      if (!data.familyWorkspace) {
        router.push("/dashboard");
        return;
      }
      setWorkspace(data.familyWorkspace);
      setNewName(data.familyWorkspace.name);
    } catch {
      setError("Failed to load workspace.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchWorkspace(); }, [fetchWorkspace]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setRenameError("");
    setRenameLoading(true);
    try {
      const res = await fetch("/api/family", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ familyName: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setRenameError(data.error ?? "Failed to rename."); return; }
      setWorkspace((w) => w ? { ...w, name: data.workspace.name } : w);
      setRenaming(false);
    } catch { setRenameError("Something went wrong."); }
    finally { setRenameLoading(false); }
  }

  async function handleGenerateInvite() {
    setInviteLoading(true);
    try {
      const res = await fetch("/api/family/invite", { method: "POST" });
      const data = await res.json();
      if (res.ok) setInviteCode(data.code);
    } finally { setInviteLoading(false); }
  }

  async function handleCopy() {
    if (!inviteCode) return;
    const url = `${window.location.origin}/invite/${inviteCode}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleLeave() {
    setLeaveLoading(true);
    setLeaveError("");
    try {
      const res = await fetch("/api/family", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { setLeaveError(data.error ?? "Failed to leave."); return; }
      router.push("/dashboard");
    } catch { setLeaveError("Something went wrong."); }
    finally { setLeaveLoading(false); }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !workspace) {
    return <p className="p-8 text-center text-red-600">{error || "Workspace not found."}</p>;
  }

  const isOwnerOrAdmin = workspace.role === "owner" || workspace.role === "admin";
  const isOwner = workspace.role === "owner";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-xl font-bold text-gray-900">Family settings</h1>
      </div>

      {/* Workspace name */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Workspace name</h2>
            {!renaming && <p className="text-2xl font-bold text-blue-700 mt-1">{workspace.name}</p>}
          </div>
          {isOwnerOrAdmin && !renaming && (
            <button
              onClick={() => setRenaming(true)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Rename
            </button>
          )}
        </div>
        {renaming && (
          <form onSubmit={handleRename} className="space-y-3">
            <input
              type="text"
              autoFocus
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setRenameError(""); }}
              className={`block w-full rounded-xl border px-4 py-2.5 text-gray-900 shadow-sm focus:outline-none focus:ring-2 ${renameError ? "border-red-400 focus:ring-red-200" : "border-gray-300 focus:ring-blue-200"}`}
            />
            {renameError && <p className="text-sm text-red-600" role="alert">{renameError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={renameLoading || !newName.trim()} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {renameLoading ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => { setRenaming(false); setNewName(workspace.name); }} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Members */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-900">Members ({workspace.members.length})</h2>
        <ul className="divide-y divide-gray-100">
          {workspace.members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <Avatar member={m} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{m.name ?? m.email}</p>
                {m.name && <p className="text-xs text-gray-500 truncate">{m.email}</p>}
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                m.role === "owner" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
              }`}>
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Invite */}
      {isOwnerOrAdmin && (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="font-semibold text-gray-900">Invite someone</h2>
            <p className="text-sm text-gray-500 mt-0.5">Generate a single-use code valid for 7 days.</p>
          </div>
          {!inviteCode ? (
            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
            >
              {inviteLoading ? "Generating…" : "Generate invite link"}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <span className="flex-1 font-mono text-lg font-bold tracking-widest text-blue-800">{inviteCode}</span>
                <button
                  onClick={handleCopy}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
              <p className="text-xs text-gray-500">Share the code or the full link — expires in 7 days, single use.</p>
              <button onClick={() => setInviteCode(null)} className="text-xs text-gray-400 hover:text-gray-600">
                Generate another
              </button>
            </div>
          )}
        </section>
      )}

      {/* Leave / danger zone */}
      <section className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        {!leaveConfirm ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Leave family workspace</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isOwner
                  ? "As owner, you can only leave if you are the last member."
                  : "You will lose access to all shared goals and habits."}
              </p>
            </div>
            <button
              onClick={() => setLeaveConfirm(true)}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Leave
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-700">Are you sure you want to leave <strong>{workspace.name}</strong>?</p>
            {leaveError && <p className="text-sm text-red-600" role="alert">{leaveError}</p>}
            <div className="flex gap-2">
              <button onClick={handleLeave} disabled={leaveLoading} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
                {leaveLoading ? "Leaving…" : "Yes, leave"}
              </button>
              <button onClick={() => { setLeaveConfirm(false); setLeaveError(""); }} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
