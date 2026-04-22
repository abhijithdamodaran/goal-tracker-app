import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function SprintsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);

  const sprints = await prisma.sprint.findMany({
    where: {
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
    include: {
      _count: { select: { actionItems: true } },
      actionItems: { select: { done: true } },
    },
    orderBy: { startDate: "desc" },
  });

  const now = new Date();
  const current = sprints.filter((s) => new Date(s.startDate) <= now && new Date(s.endDate) >= now);
  const upcoming = sprints.filter((s) => new Date(s.startDate) > now);
  const past = sprints.filter((s) => new Date(s.endDate) < now);

  function SprintCard({ sprint }: { sprint: typeof sprints[0] }) {
    const done = sprint.actionItems.filter((a) => a.done).length;
    const total = sprint.actionItems.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isNow = new Date(sprint.startDate) <= now && new Date(sprint.endDate) >= now;

    return (
      <Link href={`/sprints/${sprint.id}`} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${isNow ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
          W
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{sprint.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(sprint.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            {" — "}
            {new Date(sprint.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          {total > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-gray-100">
                <div className={`h-1.5 rounded-full ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{done}/{total} done</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isNow && <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">Current</span>}
          {sprint.reviewedAt && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Reviewed</span>}
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>
    );
  }

  // Find or hint at current sprint
  const currentSprint = current[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Dashboard</Link>
            <h1 className="text-base font-semibold text-gray-900">Sprints</h1>
          </div>
          <div className="flex items-center gap-2">
            {currentSprint && (
              <Link href={`/sprints/${currentSprint.id}`} className="rounded-xl border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50">
                Current sprint
              </Link>
            )}
            <Link href="/sprints/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              + New sprint
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {sprints.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
            <p className="text-gray-500">No sprints yet.</p>
            <p className="text-sm text-gray-400">Sprints are weekly time-boxes (Mon–Sun) for your action items.</p>
            <Link href="/sprints/new" className="inline-block mt-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Start this week&apos;s sprint
            </Link>
          </div>
        )}

        {current.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Current</h2>
            {current.map((s) => <SprintCard key={s.id} sprint={s} />)}
          </section>
        )}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming</h2>
            {upcoming.map((s) => <SprintCard key={s.id} sprint={s} />)}
          </section>
        )}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past</h2>
            {past.map((s) => <SprintCard key={s.id} sprint={s} />)}
          </section>
        )}
      </main>
    </div>
  );
}
