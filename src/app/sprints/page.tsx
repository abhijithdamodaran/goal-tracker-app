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

  const totalItems = sprints.reduce((sum, s) => sum + s.actionItems.length, 0);
  const totalDone = sprints.reduce((sum, s) => sum + s.actionItems.filter((a) => a.done).length, 0);
  const currentSprint = current[0];

  function SprintCard({ sprint, variant = "default" }: { sprint: typeof sprints[0]; variant?: "current" | "default" }) {
    const done = sprint.actionItems.filter((a) => a.done).length;
    const total = sprint.actionItems.length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const isNow = new Date(sprint.startDate) <= now && new Date(sprint.endDate) >= now;
    const dateRange = `${new Date(sprint.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(sprint.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

    if (variant === "current") {
      return (
        <Link href={`/sprints/${sprint.id}`} className="block bg-white border border-[#DCE3E8] rounded-lg p-6 hover:border-slate-400 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#00152a] text-white rounded">Current</span>
              <span className="text-xs text-[#74777e]">{dateRange}</span>
            </div>
            {sprint.reviewedAt && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Reviewed</span>
            )}
          </div>
          <h3 className="text-base font-bold text-[#171c1f] mb-4">{sprint.name}</h3>
          {total > 0 ? (
            <div>
              <div className="flex items-center justify-between text-[10px] mb-2">
                <span className="font-bold text-[#74777e] uppercase tracking-wide">Action Items ({total})</span>
                <span className="font-bold text-[#171c1f]">{pct}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[#74777e]">{done}/{total} completed</p>
            </div>
          ) : (
            <p className="text-xs text-[#74777e]">No action items yet — add some from a milestone.</p>
          )}
        </Link>
      );
    }

    return (
      <Link href={`/sprints/${sprint.id}`} className="block bg-white border border-[#DCE3E8] rounded-lg p-4 hover:border-slate-400 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] text-[#74777e]">{dateRange}</span>
              {sprint.reviewedAt && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Completed</span>
              )}
              {isNow && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#00152a]">Current</span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#171c1f] truncate">{sprint.name}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-xs text-[#74777e]">
            {total > 0 && (
              <span className="flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {done}/{total}
              </span>
            )}
            <svg className="h-3.5 w-3.5 text-[#74777e]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
        {total > 0 && (
          <div className="mt-2.5 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">Sprints</h1>
        <div className="flex items-center gap-2">
          {currentSprint && (
            <Link href={`/sprints/${currentSprint.id}`} className="rounded-md border border-[#DCE3E8] px-3 py-1.5 text-xs font-medium text-[#43474d] hover:bg-slate-50 transition-colors">
              Current sprint
            </Link>
          )}
          <Link href="/sprints/new" className="inline-flex items-center gap-1.5 bg-[#00152a] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#102a43] transition-colors">
            + New sprint
          </Link>
        </div>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        {/* Page title + stats */}
        <div>
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Active Sprints</h2>
          <p className="text-sm text-[#43474d] mt-1">Weekly time-boxes for executing your action items.</p>
        </div>

        {/* Stat bar */}
        {sprints.length > 0 && (
          <div className="bg-white border border-[#DCE3E8] rounded-lg px-6 py-4 flex items-center gap-10">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Total Sprints</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">{sprints.length}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Items Completed</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">{totalDone}/{totalItems}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Completion Rate</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight mt-0.5">
                {totalItems > 0 ? `${Math.round((totalDone / totalItems) * 100)}%` : "—"}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {sprints.length === 0 && (
          <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-16 text-center space-y-3">
            <p className="text-sm text-[#74777e]">No sprints yet.</p>
            <p className="text-xs text-[#74777e]">Sprints are weekly time-boxes (Mon–Sun) for your action items.</p>
            <Link href="/sprints/new" className="inline-flex items-center gap-1.5 mt-2 bg-[#00152a] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-[#102a43] transition-colors">
              Start this week&apos;s sprint
            </Link>
          </div>
        )}

        {/* Current sprint — larger card */}
        {current.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Current</h2>
            {current.map((s) => <SprintCard key={s.id} sprint={s} variant="current" />)}
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Upcoming</h2>
            {upcoming.map((s) => <SprintCard key={s.id} sprint={s} />)}
          </section>
        )}

        {/* Past sprints — compact grid */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Past Sprints</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {past.map((s) => <SprintCard key={s.id} sprint={s} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
