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

  // Load family membership, habit count, and goals in parallel
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
  const goals = await prisma.goal.findMany({
    where: {
      archivedAt: null,
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyWorkspaceIds } },
      ],
    },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const workspace = membership?.workspace ?? null;
  const hasFamily = workspace !== null;
  const familyHasPartner = hasFamily && workspace.members.length > 1;

  // Onboarding checklist items
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav header */}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 shadow-sm">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-gray-900">GoalTracker</span>
          </div>

          <nav className="hidden sm:flex items-center gap-1">
            <span title="Coming soon" className="cursor-default rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400">Today</span>
            <span title="Coming soon" className="cursor-default rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400">Habits</span>
            <Link href="/goals/new" className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100">Goals</Link>
            <span title="Coming soon" className="cursor-default rounded-lg px-3 py-1.5 text-sm font-medium text-gray-400">Sprints</span>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/family/settings" className="text-sm text-gray-500 hover:text-gray-700">
              {hasFamily ? workspace.name : "No family yet"}
            </Link>
            {session.user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt={displayName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome{session.user.name ? `, ${session.user.name}` : ""}!
          </h1>
          <p className="mt-1 text-gray-500">
            {completedCount === checklist.length
              ? "You're all set up. Features are coming soon."
              : "Let's get you set up. Complete the steps below to get started."}
          </p>
        </div>

        {/* Setup checklist */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Getting started</h2>
            <span className="text-sm text-gray-500">{completedCount} / {checklist.length} done</span>
          </div>
          {/* Progress bar */}
          <div className="h-1 bg-gray-100">
            <div
              className="h-1 bg-blue-500 transition-all duration-500"
              style={{ width: `${(completedCount / checklist.length) * 100}%` }}
            />
          </div>
          <ul className="divide-y divide-gray-100">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-center gap-4 px-6 py-4">
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-green-100" : "bg-gray-100"}`}>
                  {item.done ? (
                    <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-gray-300" />
                  )}
                </div>
                <span className={`flex-1 text-sm ${item.done ? "text-gray-500 line-through" : "text-gray-800 font-medium"}`}>
                  {item.label}
                </span>
                {!item.done && (
                  <Link
                    href={item.href}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {item.cta} →
                  </Link>
                )}
                {item.done && (
                  <Link href={item.href} className="text-xs text-gray-400 hover:text-gray-600">
                    {item.cta} →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Family workspace card */}
        {hasFamily && (
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{workspace.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {workspace.members.length} member{workspace.members.length !== 1 ? "s" : ""}
                </p>
              </div>
              <Link href="/family/settings" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                Manage →
              </Link>
            </div>
            <div className="mt-4 flex -space-x-2">
              {workspace.members.slice(0, 6).map((m) => (
                m.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.userId} src={m.user.image} alt={m.user.name ?? ""} className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div key={m.userId} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-blue-100 text-xs font-semibold text-blue-700">
                    {(m.user.name ?? m.user.email ?? "?").charAt(0).toUpperCase()}
                  </div>
                )
              ))}
            </div>
          </section>
        )}

        {/* Goals section */}
        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Goals</h2>
            <Link href="/goals/new" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              + New goal
            </Link>
          </div>
          {goals.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <p className="text-sm text-gray-500">No goals yet.</p>
              <Link href="/goals/new" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
                Create your first goal →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {goals.map((g) => {
                const scoreColor =
                  g.smartScore >= 4 ? "bg-green-100 text-green-700" :
                  g.smartScore >= 2 ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-500";
                return (
                  <li key={g.id}>
                    <Link href={`/goals/${g.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{g.title}</p>
                        {g.deadline && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Due {new Date(g.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor}`}>
                          {g.smartScore}/5
                        </span>
                        {g.workspaceType === "family" && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            family
                          </span>
                        )}
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Coming-soon feature cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              title: "Today's Habits",
              description: "Check in on your daily habits and track streaks.",
              icon: <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" /></svg>,
              bg: "bg-orange-50",
              phase: "Phase 6",
            },
            {
              title: "Sprint Board",
              description: "This week's action items and tasks.",
              icon: <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
              bg: "bg-green-50",
              phase: "Phase 5",
            },
          ].map((card) => (
            <div key={card.title} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bg}`}>
                {card.icon}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{card.title}</h3>
                <p className="mt-0.5 text-sm text-gray-500">{card.description}</p>
              </div>
              <span className="mt-auto text-xs font-medium text-gray-400">{card.phase} — coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
