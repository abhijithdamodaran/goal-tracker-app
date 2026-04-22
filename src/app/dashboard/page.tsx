import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) redirect("/signin");
  if (!session.user.onboardingCompleted) redirect("/onboarding");

  const userId = session.user.id;
  const displayName = session.user.name ?? session.user.email ?? "there";
  const now = new Date();

  const [membership, habitCount, familyMemberships] = await Promise.all([
    prisma.familyMember.findFirst({
      where: { userId },
      include: {
        workspace: {
          include: { members: { include: { user: { select: { name: true, image: true, email: true } } } } },
        },
      },
    }),
    prisma.habit.count({ where: { userId, isActive: true } }),
    prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } }),
  ]);

  const familyWorkspaceIds = familyMemberships.map((m) => m.workspaceId);

  const [goals, currentSprint, todayHabits] = await Promise.all([
    prisma.goal.findMany({
      where: {
        archivedAt: null,
        OR: [
          { ownerId: userId, workspaceType: "personal" },
          { workspaceType: "family", workspaceId: { in: familyWorkspaceIds } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        deadline: true,
        smartScore: true,
        workspaceType: true,
        milestones: { select: { id: true, completedAt: true } },
        owner: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sprint.findFirst({
      where: {
        OR: [
          { ownerId: userId, workspaceType: "personal" },
          { workspaceType: "family", workspaceId: { in: familyWorkspaceIds } },
        ],
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        actionItems: { select: { id: true, done: true } },
      },
    }),
    prisma.habit.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "asc" },
      take: 6,
    }),
  ]);

  const workspace = membership?.workspace ?? null;
  const hasFamily = workspace !== null;
  const familyHasPartner = hasFamily && workspace.members.length > 1;

  const checklist = [
    {
      id: "family",
      done: hasFamily,
      label: hasFamily ? `Family workspace: ${workspace.name}` : "Create or join a family workspace",
      href: hasFamily ? "/family/settings" : "/family/create",
      cta: hasFamily ? "Manage" : "Set up",
    },
    {
      id: "partner",
      done: familyHasPartner,
      label: familyHasPartner ? "Partner has joined" : "Invite your partner",
      href: "/family/settings",
      cta: "Invite",
      hidden: !hasFamily,
    },
    {
      id: "habit",
      done: habitCount > 0,
      label: habitCount > 0 ? `${habitCount} habit${habitCount !== 1 ? "s" : ""} created` : "Create your first habit",
      href: "/habits/new",
      cta: "Create",
    },
    {
      id: "goal",
      done: goals.length > 0,
      label: goals.length > 0 ? `${goals.length} goal${goals.length !== 1 ? "s" : ""} created` : "Create your first goal",
      href: "/goals/new",
      cta: "Create",
    },
  ].filter((c) => !c.hidden);

  const completedCount = checklist.filter((c) => c.done).length;
  const setupDone = completedCount === checklist.length;

  const sprintItems = currentSprint?.actionItems ?? [];
  const sprintDone = sprintItems.filter((a) => a.done).length;
  const sprintPct = sprintItems.length > 0 ? Math.round((sprintDone / sprintItems.length) * 100) : 0;

  // Days remaining in sprint
  const sprintDaysLeft = currentSprint
    ? Math.max(0, Math.ceil((new Date(currentSprint.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  const dow = now.getDay();

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Top header bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">
          {setupDone ? "Goal Dashboard" : `Welcome, ${displayName}`}
        </h1>
        <Link
          href="/goals/new"
          className="hidden sm:inline-flex items-center gap-1.5 bg-[#00152a] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#102a43] transition-colors"
        >
          + New goal
        </Link>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto space-y-8">

        {/* Page title */}
        <div>
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Goal Dashboard</h2>
          <p className="text-sm text-[#43474d] mt-1">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Setup checklist */}
        {!setupDone && (
          <section className="border border-[#DCE3E8] bg-white overflow-hidden rounded-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE3E8]">
              <h3 className="text-sm font-semibold text-[#171c1f]">Getting started</h3>
              <span className="text-xs text-[#74777e]">{completedCount} / {checklist.length}</span>
            </div>
            <div className="h-0.5 bg-slate-100">
              <div className="h-0.5 bg-[#00152a] transition-all" style={{ width: `${(completedCount / checklist.length) * 100}%` }} />
            </div>
            <ul className="divide-y divide-[#DCE3E8]">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-3.5">
                  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${item.done ? "bg-emerald-50" : "bg-slate-100"}`}>
                    {item.done ? (
                      <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />}
                  </div>
                  <span className={`flex-1 text-sm ${item.done ? "text-[#74777e] line-through" : "text-[#171c1f] font-medium"}`}>
                    {item.label}
                  </span>
                  <Link href={item.href} className={`text-xs font-semibold ${item.done ? "text-[#74777e] hover:text-[#43474d]" : "text-[#00152a] hover:text-[#102a43]"}`}>
                    {item.cta} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Active Goals */}
          <div className="bg-white border border-[#DCE3E8] p-5 rounded-lg flex flex-col justify-between h-28">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Active Goals</span>
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-[#171c1f] tracking-tight leading-none">{goals.length}</span>
              {goals.length > 0 && <span className="text-[10px] text-emerald-600 font-semibold">active</span>}
            </div>
          </div>

          {/* Current Sprint */}
          <Link href={currentSprint ? `/sprints/${currentSprint.id}` : "/sprints/new"} className="bg-white border border-[#DCE3E8] p-5 rounded-lg flex flex-col justify-between h-28 hover:border-slate-400 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Current Sprint</span>
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              {currentSprint ? (
                <>
                  <span className="text-3xl font-semibold text-[#171c1f] tracking-tight leading-none">{String(sprintDaysLeft).padStart(2, "0")}</span>
                  <span className="text-[10px] text-[#74777e]">days left</span>
                </>
              ) : (
                <span className="text-sm text-[#74777e]">No active sprint</span>
              )}
            </div>
          </Link>

          {/* Habits Tracked */}
          <Link href="/habits" className="bg-white border border-[#DCE3E8] p-5 rounded-lg flex flex-col justify-between h-28 hover:border-slate-400 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Habits Tracked</span>
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-semibold text-[#171c1f] tracking-tight leading-none">{habitCount}</span>
              <span className="text-[10px] text-[#74777e]">active</span>
            </div>
          </Link>

          {/* Sprint Progress */}
          <Link href={currentSprint ? `/sprints/${currentSprint.id}` : "/sprints/new"} className="bg-white border border-[#DCE3E8] p-5 rounded-lg flex flex-col justify-between h-28 hover:border-slate-400 transition-colors">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Sprint Progress</span>
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            {currentSprint ? (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-bold text-[#171c1f]">{sprintPct}%</span>
                  <span className="text-[10px] text-[#74777e]">{sprintDone}/{sprintItems.length}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#00152a] rounded-full" style={{ width: `${sprintPct}%` }} />
                </div>
              </div>
            ) : (
              <span className="text-sm text-[#74777e]">—</span>
            )}
          </Link>
        </div>

        {/* Goals grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-[#171c1f]">Active Goals</h3>
            <Link href="/goals" className="text-xs font-medium text-[#00152a] hover:underline flex items-center gap-1">
              View all →
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-14 text-center">
              <p className="text-sm text-[#74777e]">No goals yet.</p>
              <Link href="/goals/new" className="mt-2 inline-block text-sm font-medium text-[#00152a] hover:underline">
                Create your first goal →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {goals.slice(0, 6).map((g) => {
                const total = g.milestones.length;
                const done = g.milestones.filter((m) => m.completedAt).length;
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                const scoreColor =
                  g.smartScore >= 4 ? "bg-emerald-50 text-emerald-700" :
                  g.smartScore >= 2 ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-[#74777e]";

                return (
                  <Link
                    key={g.id}
                    href={`/goals/${g.id}`}
                    className="group bg-white border border-[#DCE3E8] p-5 rounded-lg hover:border-slate-400 transition-colors block"
                  >
                    {/* Category chip + title */}
                    <div className="mb-3">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded mb-2 ${
                        g.workspaceType === "family"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-slate-100 text-[#43474d]"
                      }`}>
                        {g.workspaceType === "family" ? "Family" : "Personal"}
                      </span>
                      <h4 className="text-sm font-bold text-[#171c1f] leading-snug">{g.title}</h4>
                    </div>

                    {/* Description */}
                    {g.description && (
                      <p className="text-xs text-[#43474d] mb-4 line-clamp-2 leading-relaxed">{g.description}</p>
                    )}

                    {/* Progress */}
                    {total > 0 ? (
                      <div className="mb-4">
                        <div className="flex justify-between items-center text-[10px] mb-1.5">
                          <span className="text-[#74777e] font-medium">Milestone progress</span>
                          <span className="font-bold text-[#171c1f]">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[#74777e] mb-4">No milestones yet</p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${scoreColor}`}>
                        {g.smartScore}/5 SMART
                      </span>
                      {g.deadline && (
                        <span className="text-[10px] text-[#74777e]">
                          Due {new Date(g.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Add new goal card */}
              <Link
                href="/goals/new"
                className="bg-white border border-dashed border-[#DCE3E8] p-5 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-400 hover:bg-slate-50 transition-colors min-h-[140px]"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-xs font-medium text-[#74777e]">Add a new goal</span>
              </Link>
            </div>
          )}
        </section>

        {/* Habits overview */}
        {todayHabits.length > 0 && (
          <section className="bg-white border border-[#DCE3E8] rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#DCE3E8]">
              <h3 className="text-sm font-semibold text-[#171c1f]">Habits</h3>
              <Link href="/habits" className="text-xs font-medium text-[#00152a] hover:underline">View all →</Link>
            </div>
            <ul className="divide-y divide-[#DCE3E8]">
              {todayHabits.map((h) => {
                let scheduledDays: number[] = [0, 1, 2, 3, 4, 5, 6];
                try { scheduledDays = JSON.parse(h.scheduledDays); } catch { /* use default */ }
                const isToday = scheduledDays.includes(dow);
                const streakColor = h.streakCount >= 7 ? "text-orange-600" : h.streakCount >= 3 ? "text-[#00152a]" : "text-[#74777e]";
                return (
                  <li key={h.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${isToday ? "bg-[#00152a]" : "bg-slate-200"}`} />
                    <Link href={`/habits/${h.id}`} className="flex-1 text-sm text-[#171c1f] truncate hover:underline">{h.title}</Link>
                    <span className={`text-xs font-semibold shrink-0 ${streakColor}`}>🔥 {h.streakCount}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}
