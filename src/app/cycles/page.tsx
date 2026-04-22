import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half-yearly",
  yearly: "Yearly",
};

const TYPE_ABBR: Record<string, string> = {
  monthly: "M",
  quarterly: "Q",
  "half-yearly": "H",
  yearly: "Y",
};

const TYPE_TAG: Record<string, string> = {
  monthly: "bg-blue-50 text-blue-700",
  quarterly: "bg-purple-50 text-purple-700",
  "half-yearly": "bg-amber-50 text-amber-700",
  yearly: "bg-emerald-50 text-emerald-700",
};

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);

  const cycles = await prisma.cycle.findMany({
    where: {
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
    include: {
      _count: { select: { milestones: true } },
      milestones: { select: { completedAt: true } },
    },
    orderBy: { startDate: "asc" },
  });

  const now = new Date();
  const active = cycles.filter((c) => new Date(c.startDate) <= now && new Date(c.endDate) >= now);
  const upcoming = cycles.filter((c) => new Date(c.startDate) > now);
  const past = cycles.filter((c) => new Date(c.endDate) < now);

  function CycleCard({ cycle, featured = false }: { cycle: typeof cycles[0]; featured?: boolean }) {
    const completedCount = cycle.milestones.filter((m) => m.completedAt).length;
    const totalCount = cycle.milestones.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const tagColor = TYPE_TAG[cycle.type] ?? "bg-slate-100 text-[#43474d]";
    const dateRange = `${new Date(cycle.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })} – ${new Date(cycle.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

    if (featured) {
      return (
        <Link href={`/cycles/${cycle.id}`} className="block bg-white border border-[#DCE3E8] rounded-lg p-6 hover:border-slate-400 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${tagColor}`}>
                  {TYPE_LABELS[cycle.type]} Window
                </span>
              </div>
              <h3 className="text-base font-bold text-[#171c1f]">{cycle.name}</h3>
              <p className="text-xs text-[#74777e] mt-0.5">{dateRange}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Progress</p>
              <p className="text-2xl font-semibold text-[#171c1f] tracking-tight leading-tight">{pct}%</p>
            </div>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-[#74777e]">{completedCount}/{totalCount} milestones complete</p>
        </Link>
      );
    }

    return (
      <Link href={`/cycles/${cycle.id}`} className="block bg-white border border-[#DCE3E8] rounded-lg p-4 hover:border-slate-400 transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${tagColor}`}>
                {TYPE_ABBR[cycle.type] ?? "?"}
              </span>
              <span className="text-[10px] text-[#74777e]">{dateRange}</span>
            </div>
            <p className="text-sm font-semibold text-[#171c1f] truncate">{cycle.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-[#171c1f]">{pct}%</span>
            <svg className="h-3.5 w-3.5 text-[#74777e]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
        {totalCount > 0 && (
          <div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden mb-1">
              <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`} style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-[#74777e]">{completedCount}/{totalCount} milestones</p>
          </div>
        )}
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">Cycles</h1>
        <Link href="/cycles/new" className="inline-flex items-center gap-1.5 bg-[#00152a] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#102a43] transition-colors">
          + New cycle
        </Link>
      </header>

      <main className="px-6 py-8 max-w-4xl mx-auto space-y-8">
        {/* Page title */}
        <div>
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Cycles Management</h2>
          <p className="text-sm text-[#43474d] mt-1">Orchestrate long-term progress by scoping milestones into rhythmic windows.</p>
        </div>

        {/* Empty state */}
        {cycles.length === 0 && (
          <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-16 text-center space-y-3">
            <p className="text-sm text-[#74777e]">No cycles yet.</p>
            <p className="text-xs text-[#74777e]">Cycles are time windows (monthly, quarterly, etc.) that scope your milestones.</p>
            <Link href="/cycles/new" className="inline-flex items-center gap-1.5 mt-2 bg-[#00152a] text-white text-xs font-medium px-4 py-2 rounded-md hover:bg-[#102a43] transition-colors">
              Create your first cycle
            </Link>
          </div>
        )}

        {/* Active — first one featured, rest in grid */}
        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Active</h2>
            {active[0] && <CycleCard cycle={active[0]} featured />}
            {active.length > 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {active.slice(1).map((c) => <CycleCard key={c.id} cycle={c} />)}
              </div>
            )}
          </section>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Active Monthly &amp; Quarterly Windows</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcoming.map((c) => <CycleCard key={c.id} cycle={c} />)}
              {/* New cycle placeholder */}
              <Link href="/cycles/new" className="bg-white border border-dashed border-[#DCE3E8] rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-slate-400 hover:bg-slate-50 transition-colors min-h-[100px]">
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                  <svg className="h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </div>
                <span className="text-[10px] font-medium text-[#74777e] text-center">New Window<br/>Draft next cycle</span>
              </Link>
            </div>
          </section>
        )}

        {/* Past */}
        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-[#74777e]">Past</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {past.map((c) => <CycleCard key={c.id} cycle={c} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
