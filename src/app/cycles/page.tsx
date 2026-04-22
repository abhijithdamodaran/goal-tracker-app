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

const TYPE_COLORS: Record<string, string> = {
  monthly: "bg-blue-100 text-blue-700",
  quarterly: "bg-purple-100 text-purple-700",
  "half-yearly": "bg-orange-100 text-orange-700",
  yearly: "bg-green-100 text-green-700",
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

  function CycleCard({ cycle }: { cycle: typeof cycles[0] }) {
    const completedCount = cycle.milestones.filter((m) => m.completedAt).length;
    const totalCount = cycle.milestones.length;
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const color = TYPE_COLORS[cycle.type] ?? "bg-gray-100 text-gray-600";

    return (
      <Link href={`/cycles/${cycle.id}`} className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color} text-xs font-bold`}>
          {cycle.type === "monthly" ? "M" : cycle.type === "quarterly" ? "Q" : cycle.type === "half-yearly" ? "H" : "Y"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{cycle.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {new Date(cycle.startDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            {" — "}
            {new Date(cycle.endDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </p>
          {totalCount > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 w-24 rounded-full bg-gray-100">
                <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{completedCount}/{totalCount} done</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{TYPE_LABELS[cycle.type]}</span>
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Cycles</h1>
          <Link href="/cycles/new" className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            + New cycle
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {cycles.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center space-y-3">
            <p className="text-gray-500">No cycles yet.</p>
            <p className="text-sm text-gray-400">Cycles are time windows (monthly, quarterly, etc.) that scope your milestones.</p>
            <Link href="/cycles/new" className="inline-block mt-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Create your first cycle
            </Link>
          </div>
        )}

        {active.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Active</h2>
            {active.map((c) => <CycleCard key={c.id} cycle={c} />)}
          </section>
        )}

        {upcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Upcoming</h2>
            {upcoming.map((c) => <CycleCard key={c.id} cycle={c} />)}
          </section>
        )}

        {past.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Past</h2>
            {past.map((c) => <CycleCard key={c.id} cycle={c} />)}
          </section>
        )}
      </main>
    </div>
  );
}
