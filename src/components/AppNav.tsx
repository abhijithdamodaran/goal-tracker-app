"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Zap,
  RefreshCw,
  Clock,
  ListChecks,
  Settings,
  Plus,
  MoreHorizontal,
} from "lucide-react";

interface AppNavProps {
  user: {
    name?: string | null;
    image?: string | null;
    homeScreen?: string;
  } | null;
}

const AUTH_PREFIXES = ["/signin", "/signup", "/onboarding", "/verify-request", "/auth-error", "/invite"];

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/today", label: "Today", Icon: CalendarDays },
  { href: "/goals", label: "Goals", Icon: Target },
  { href: "/sprints", label: "Sprints", Icon: Zap },
  { href: "/habits", label: "Habits", Icon: RefreshCw },
  { href: "/cycles", label: "Cycles", Icon: Clock },
  { href: "/action-items", label: "Action Items", Icon: ListChecks },
];

const MOBILE_MAIN = NAV_ITEMS.slice(0, 4);
const MOBILE_MORE = [
  ...NAV_ITEMS.slice(4),
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function AppNav({ user }: AppNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const isAuthPage = AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user || isAuthPage) return null;

  const initial = (user.name ?? "U").charAt(0).toUpperCase();
  const moreActive = MOBILE_MORE.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <>
      {/* ── Desktop left sidebar ── */}
      <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 bg-white border-r border-[#DCE3E8] z-40">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-[#DCE3E8]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#00152a] shrink-0">
              <Target className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#171c1f] leading-tight">GoalTracker</p>
              <p className="text-[10px] text-[#74777e] leading-tight tracking-wide">Quiet Productivity</p>
            </div>
          </Link>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-[#171c1f]"
                    : "text-[#43474d] hover:bg-slate-50 hover:text-[#171c1f]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* New Goal CTA */}
        <div className="px-3 pb-4">
          <Link
            href="/goals/new"
            className="flex items-center justify-center gap-2 w-full bg-[#00152a] text-white text-sm font-medium py-2.5 rounded-md hover:bg-[#102a43] transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Goal
          </Link>
        </div>

        {/* Settings link */}
        <div className="border-t border-[#DCE3E8] px-3 py-3">
          <Link
            href="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-slate-100 text-[#171c1f]"
                : "text-[#43474d] hover:bg-slate-50 hover:text-[#171c1f]"
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </Link>
        </div>

        {/* User avatar */}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-5 py-4 border-t border-[#DCE3E8] hover:bg-slate-50 transition-colors"
        >
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name ?? "User"}
              className="h-8 w-8 rounded-full border border-[#DCE3E8] object-cover shrink-0"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-[#171c1f] shrink-0">
              {initial}
            </div>
          )}
          <p className="text-sm font-semibold text-[#171c1f] truncate">{user.name ?? "User"}</p>
        </Link>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#DCE3E8] bg-white">
        <div className="flex items-center justify-around px-1 py-2">
          {MOBILE_MAIN.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
                  isActive ? "text-[#00152a]" : "text-[#74777e]"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-md transition-colors ${
              moreActive || moreOpen ? "text-[#00152a]" : "text-[#74777e]"
            }`}
          >
            <MoreHorizontal className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More drawer */}
      {moreOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 bg-black/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="md:hidden fixed bottom-16 inset-x-0 z-40 bg-white border-t border-[#DCE3E8] rounded-t-xl">
            <div className="px-4 pt-4 pb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e] mb-3">More</p>
              <div className="grid grid-cols-4 gap-2">
                {MOBILE_MORE.map(({ href, label, Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(`${href}/`);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex flex-col items-center gap-1.5 rounded-lg p-3 transition-colors ${
                        isActive ? "bg-slate-100 text-[#00152a]" : "text-[#43474d] hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
