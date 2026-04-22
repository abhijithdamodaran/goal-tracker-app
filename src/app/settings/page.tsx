"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Madrid",
  "Europe/Amsterdam",
  "Europe/Stockholm",
  "Europe/Helsinki",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Bangkok",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Pacific/Auckland",
];

const HOME_SCREEN_OPTIONS = [
  { value: "today", label: "Today", description: "Daily habits + current sprint items" },
  { value: "sprint", label: "Sprint Board", description: "Current weekly sprint in full" },
  { value: "dashboard", label: "Goal Dashboard", description: "Goals, milestones, and progress" },
];

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();

  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [homeScreen, setHomeScreen] = useState("today");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  interface FamilyMember { id: string; name: string | null; email: string | null; image: string | null; role: string; }
  interface FamilyWorkspace { id: string; name: string; role: string; members: FamilyMember[]; }
  const [family, setFamily] = useState<FamilyWorkspace | null>(null);

  useEffect(() => {
    async function loadUser() {
      const res = await fetch("/api/user/me");
      if (!res.ok) return;
      const data = await res.json();
      setName(data.user.name ?? "");
      setTimezone(data.user.timezone ?? "UTC");
      setHomeScreen(data.user.homeScreen ?? "today");
      if (data.familyWorkspace) setFamily(data.familyWorkspace);
    }
    loadUser();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || null, timezone, homeScreen }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save."); return; }
      // Refresh the JWT session so homeScreen is up to date
      await updateSession();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const displayName = session?.user?.name ?? session?.user?.email ?? "there";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {/* Profile */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="font-semibold text-gray-900">Profile</h2>

            <div className="flex items-center gap-4">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt={displayName} className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">{displayName}</p>
                <p className="text-sm text-gray-500">{session?.user?.email}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Home screen */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div>
              <h2 className="font-semibold text-gray-900">Home screen</h2>
              <p className="text-sm text-gray-500 mt-0.5">Which view opens when you launch the app</p>
            </div>
            <div className="space-y-2">
              {HOME_SCREEN_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                    homeScreen === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="homeScreen"
                    value={opt.value}
                    checked={homeScreen === opt.value}
                    onChange={(e) => setHomeScreen(e.target.value)}
                    className="accent-blue-600"
                  />
                  <div>
                    <p className={`font-medium text-sm ${homeScreen === opt.value ? "text-blue-900" : "text-gray-900"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* Notifications (stub) */}
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4 opacity-60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-500 mt-0.5">Push notifications — coming in a future update</p>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Soon</span>
            </div>
            <div className="space-y-3">
              {["Daily habit reminder", "Sprint start / end alerts", "Milestone deadline approaching"].map((label) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{label}</span>
                  <div className="h-5 w-9 rounded-full bg-gray-200 cursor-not-allowed" />
                </div>
              ))}
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save changes"}
            </button>
          </div>
        </form>

        {/* Family workspace */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Family workspace</h2>
            {family && (
              <Link href="/family/settings" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Manage →
              </Link>
            )}
          </div>
          {family ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-800">{family.name}</p>
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 capitalize">{family.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {family.members.slice(0, 6).map((m) => (
                    m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.image} alt={m.name ?? ""} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div key={m.id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-xs font-semibold text-blue-700">
                        {(m.name ?? m.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                </div>
                <span className="text-sm text-gray-500">{family.members.length} member{family.members.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">You haven&apos;t joined a family workspace yet.</p>
              <div className="flex gap-3">
                <Link href="/family/create" className="text-sm font-medium text-blue-600 hover:text-blue-700">Create workspace →</Link>
                <Link href="/family/join" className="text-sm font-medium text-gray-500 hover:text-gray-700">Join with code →</Link>
              </div>
            </div>
          )}
        </section>

        {/* Sign out */}
        <section className="rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-red-700 text-sm mb-3">Account</h2>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">Sign out of GoalTracker</p>
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              Sign out
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
