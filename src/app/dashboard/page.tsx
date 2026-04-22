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
      include: {
        milestones: {
          select: { id: true, completedAt: true },
        },
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

  // Sprint stats
  const sprintItems = currentSprint?.actionItems ?? [];
  const sprintDone = sprintItems.filter((a) => a.done).length;
  const sprintPct = sprintItems.length > 0 ? Math.round((sprintDone / sprintItems.length) * 100) : 0;

  // Today's day-of-week
  const dow = now.getDay();

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {setupDone ? "Goal Dashboard" : `Welcome, ${displayName}!`}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {setupDone
                ? now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
                : "Let's get you set up."}
            </p>
          </div>
          <Link
            href="/goals/new"
            className="hidden sm:inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New goal
          </Link>
        </div>

        {/* Setup checklist (always shown until complete, then collapsible) */}
        {!setupDone && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Getting started</h2>
              <span className="text-sm text-gray-500">{completedCount} / {checklist.length}</span>
            </div>
            <div className="h-1 bg-gray-100">
              <div className="h-1 bg-blue-500 transition-all" style={{ width: `${(completedCount / checklist.length) * 100}%` }} />
            </div>
            <ul className="divide-y divide-gray-100">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                  <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-green-100" : "bg-gray-100"}`}>
                    {item.done ? (
                      <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    ) : <div className="h-2 w-2 rounded-full bg-gray-300" />}
                  </div>
                  <span className={`flex-1 text-sm ${item.done ? "text-gray-400 line-through" : "text-gray-800 font-medium"}`}>
                    {item.label}
                  </span>
                  <Link href={item.href} className={`text-xs font-semibold ${item.done ? "text-gray-400 hover:text-gray-600" : "text-blue-600 hover:text-blue-700"}`}>
                    {item.cta} →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Active goals", value: goals.length, href: "/goals" },
            { label: "Current sprint", value: currentSprint ? `${sprintDone}/${sprintItems.length}` : "—", href: currentSprint ? `/sprints/${currentSprint.id}` : "/sprints" },
            { label: "Habits tracked", value: habitCount, href: "/habits" },
            { label: "Sprint progress", value: currentSprint ? `${sprintPct}%` : "—", href: currentSprint ? `/sprints/${currentSprint.id}` : "/sprints/new" },
          ].map((card) => (
            <Link key={card.label} href={card.href} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm text-center hover:shadow-md transition-shadow">
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goals with milestone progress */}
          <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Goals</h2>
              <Link href="/goals" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all →</Link>
            </div>
            {goals.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm text-gray-500">No goals yet.</p>
                <Link href="/goals/new" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">Create your first goal →</Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {goals.slice(0, 6).map((g) => {
                  const total = g.milestones.length;
                  const done = g.milestones.filter((m) => m.completedAt).length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const scoreColor = g.smartScore >= 4 ? "bg-green-100 text-green-700" : g.smartScore >= 2 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500";
                  return (
                    <li key={g.id}>
                      <Link href={`/goals/${g.id}`} className="block px-5 py-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${scoreColor}`}>{g.smartScore}/5</span>
                            {g.workspaceType === "family" && (
                              <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-xs font-medium text-purple-700">family</span>
                            )}
                          </div>
                        </div>
                        {total > 0 ? (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-400">
                              <span>{done}/{total} milestones</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-gray-100">
                              <div className={`h-1.5 rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400">No milestones yet</p>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Right column: sprint + habits */}
          <div className="space-y-4">
            {/* Current sprint */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Current sprint</h2>
                <Link href={currentSprint ? `/sprints/${currentSprint.id}` : "/sprints/new"} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                  {currentSprint ? "View →" : "Start →"}
                </Link>
              </div>
              {currentSprint ? (
                <div className="px-5 py-4 space-y-3">
                  <p className="text-sm font-medium text-gray-800">{currentSprint.name}</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{sprintDone}/{sprintItems.length} done</span>
                      <span className="font-semibold text-gray-900">{sprintPct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div className={`h-2 rounded-full ${sprintPct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${sprintPct}%` }} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Ends {new Date(currentSprint.endDate).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>
              ) : (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-gray-500">No active sprint this week.</p>
                </div>
              )}
            </section>

            {/* Habits overview */}
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Habits</h2>
                <Link href="/habits" className="text-xs font-medium text-blue-600 hover:text-blue-700">View all →</Link>
              </div>
              {todayHabits.length === 0 ? (
                <div className="px-5 py-6 text-center">
                  <p className="text-xs text-gray-500">No habits yet.</p>
                  <Link href="/habits/new" className="mt-1 inline-block text-xs font-medium text-blue-600 hover:text-blue-700">Create one →</Link>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {todayHabits.map((h) => {
                    let scheduledDays: number[] = [0,1,2,3,4,5,6];
                    try { scheduledDays = JSON.parse(h.scheduledDays); } catch { /* use default */ }
                    const isToday = scheduledDays.includes(dow);
                    const streakColor = h.streakCount >= 7 ? "text-orange-600" : h.streakCount >= 3 ? "text-blue-600" : "text-gray-400";
                    return (
                      <li key={h.id} className="flex items-center gap-3 px-5 py-3">
                        <div className={`h-2 w-2 rounded-full shrink-0 ${isToday ? "bg-blue-500" : "bg-gray-200"}`} />
                        <Link href={`/habits/${h.id}`} className="flex-1 text-sm text-gray-800 truncate hover:underline">{h.title}</Link>
                        <span className={`text-xs font-semibold shrink-0 ${streakColor}`}>🔥{h.streakCount}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
