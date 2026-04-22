"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { CalendarDays, LayoutDashboard, Target } from "lucide-react";

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
  { value: "today", label: "Today", description: "Daily focus and immediate tasks.", Icon: CalendarDays },
  { value: "sprint", label: "Sprint Board", description: "Kanban view of active weekly sprint.", Icon: LayoutDashboard },
  { value: "dashboard", label: "Goal Dashboard", description: "High-level metrics and goal progress.", Icon: Target },
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
      await updateSession();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const displayName = session?.user?.name ?? session?.user?.email ?? "there";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center">
        <h1 className="text-sm font-semibold text-[#171c1f]">Settings</h1>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-10">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* User Profile */}
        <section>
          <h2 className="text-lg font-semibold text-[#171c1f] mb-1">User Profile</h2>
          <p className="text-sm text-[#43474d] mb-6">Manage your identity and display preferences.</p>

          <div className="bg-white border border-[#DCE3E8] rounded-lg p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt={displayName} className="h-12 w-12 rounded-full border border-[#DCE3E8] object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-base font-bold text-[#171c1f]">
                    {initial}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-[#171c1f] text-sm">{displayName}</p>
                  <p className="text-xs text-[#74777e]">{session?.user?.email}</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            {/* Display name */}
            <div>
              <label className="block text-sm font-medium text-[#171c1f] mb-1.5">Display name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
                className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2.5 text-sm text-[#171c1f] bg-white focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-[#171c1f] mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="block w-full rounded-md border border-[#DCE3E8] px-3 py-2.5 text-sm text-[#171c1f] bg-white focus:border-[#00152a] focus:outline-none focus:ring-1 focus:ring-[#00152a]"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            {/* Default Home Screen */}
            <div>
              <h3 className="text-base font-semibold text-[#171c1f] mb-1">Default Home Screen</h3>
              <p className="text-sm text-[#43474d] mb-4">Choose which view opens when you launch GoalTracker.</p>
              <div className="grid grid-cols-3 gap-3">
                {HOME_SCREEN_OPTIONS.map(({ value, label, description, Icon }) => (
                  <label
                    key={value}
                    className={`flex flex-col gap-2 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      homeScreen === value
                        ? "border-[#00152a] bg-white"
                        : "border-[#DCE3E8] bg-white hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="homeScreen"
                      value={value}
                      checked={homeScreen === value}
                      onChange={(e) => setHomeScreen(e.target.value)}
                      className="sr-only"
                    />
                    <Icon className={`h-5 w-5 ${homeScreen === value ? "text-[#00152a]" : "text-slate-400"}`} />
                    <div>
                      <p className={`text-sm font-semibold ${homeScreen === value ? "text-[#00152a]" : "text-[#171c1f]"}`}>{label}</p>
                      <p className="text-[11px] text-[#74777e] mt-0.5 leading-snug">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Notifications (stub) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-[#171c1f]">Notifications</h3>
                  <p className="text-sm text-[#43474d] mt-0.5">Push notifications — coming in a future update.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#74777e]">Soon</span>
              </div>
              <div className="space-y-4 opacity-60 pointer-events-none">
                {[
                  { label: "System Alerts", desc: "Important updates about your account and security." },
                  { label: "Sprint Reminders", desc: "Daily nudges to update your sprint progress." },
                  { label: "Weekly Summary", desc: "A detailed email report of your weekly productivity." },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex items-center justify-between py-3 border-b border-[#DCE3E8] last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#171c1f]">{label}</p>
                      <p className="text-xs text-[#74777e] mt-0.5">{desc}</p>
                    </div>
                    <div className="h-6 w-11 rounded-full bg-slate-200 cursor-not-allowed shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            {/* Save / Discard */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#DCE3E8]">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-[#DCE3E8] px-5 py-2 text-sm font-medium text-[#43474d] hover:bg-slate-50 transition-colors"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#00152a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#102a43] disabled:opacity-60 transition-colors"
              >
                {saving ? "Saving…" : saved ? "✓ Saved" : "Save Preferences"}
              </button>
            </div>
          </form>
        </section>

        {/* Family workspace */}
        <section>
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold text-[#171c1f]">Family Workspace</h2>
            {family && (
              <Link href="/family/settings" className="text-sm font-medium text-[#00152a] hover:underline">
                Manage →
              </Link>
            )}
          </div>
          <p className="text-sm text-[#43474d] mb-6">
            {family ? "Your shared workspace for goals and habits." : "Create or join a family workspace to share goals with your partner."}
          </p>

          {family ? (
            <div className="bg-white border border-[#DCE3E8] rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-[#171c1f] text-sm">{family.name}</p>
                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 capitalize">{family.role}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {family.members.slice(0, 6).map((m) => (
                    m.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.image} alt={m.name ?? ""} className="h-7 w-7 rounded-full border-2 border-white object-cover" />
                    ) : (
                      <div key={m.id} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-200 text-[10px] font-bold text-[#171c1f]">
                        {(m.name ?? m.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )
                  ))}
                </div>
                <span className="text-xs text-[#74777e]">{family.members.length} member{family.members.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#DCE3E8] rounded-lg p-5">
              <p className="text-sm text-[#43474d] mb-4">You haven&apos;t joined a family workspace yet.</p>
              <div className="flex gap-3">
                <Link href="/family/create" className="inline-flex items-center rounded-md bg-[#00152a] px-4 py-2 text-xs font-semibold text-white hover:bg-[#102a43] transition-colors">
                  Create workspace
                </Link>
                <Link href="/family/join" className="inline-flex items-center rounded-md border border-[#DCE3E8] px-4 py-2 text-xs font-medium text-[#43474d] hover:bg-slate-50 transition-colors">
                  Join with code
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Account / Sign out */}
        <section>
          <h2 className="text-lg font-semibold text-red-700 mb-1">Account</h2>
          <p className="text-sm text-[#43474d] mb-6">Manage your session.</p>
          <div className="bg-white border border-red-100 rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#171c1f]">Sign out of GoalTracker</p>
              <p className="text-xs text-[#74777e] mt-0.5">You will be redirected to the sign-in page.</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
