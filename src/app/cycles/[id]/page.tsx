import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

const TYPE_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  "half-yearly": "Half-yearly",
  yearly: "Yearly",
};

const TYPE_COLORS: Record<string, string> = {
  monthly: "bg-blue-50 text-blue-700",
  quarterly: "bg-purple-50 text-purple-700",
  "half-yearly": "bg-amber-50 text-amber-700",
  yearly: "bg-emerald-50 text-emerald-700",
};

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const userId = session.user.id;

  const cycle = await prisma.cycle.findUnique({ where: { id } });
  if (!cycle) notFound();

  let hasAccess = cycle.ownerId === userId;
  if (!hasAccess && cycle.workspaceType === "family" && cycle.workspaceId) {
    const m = await prisma.familyMember.findFirst({ where: { userId, workspaceId: cycle.workspaceId } });
    hasAccess = !!m;
  }
  if (!hasAccess) notFound();

  const milestones = await prisma.milestone.findMany({
    where: { cycleId: id },
    include: { goal: { select: { id: true, title: true, smartScore: true, workspaceType: true } } },
    orderBy: [{ goal: { title: "asc" } }, { createdAt: "asc" }],
  });

  const byGoal = new Map<string, { goal: typeof milestones[0]["goal"]; milestones: typeof milestones }>();
  for (const m of milestones) {
    if (!byGoal.has(m.goalId)) byGoal.set(m.goalId, { goal: m.goal, milestones: [] });
    byGoal.get(m.goalId)!.milestones.push(m);
  }

  const completedCount = milestones.filter((m) => m.completedAt).length;
  const totalCount = milestones.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const now = new Date();
  const isActive = new Date(cycle.startDate) <= now && new Date(cycle.endDate) >= now;
  const isPast = new Date(cycle.endDate) < now;

  const color = TYPE_COLORS[cycle.type] ?? "bg-slate-100 text-[#74777e]";

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#74777e]">
          <Link href="/cycles" className="hover:text-[#43474d]">Cycles</Link>
          <span className="text-[#DCE3E8]">/</span>
          <span className="text-[#171c1f] font-medium truncate max-w-40">{cycle.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>}
          {isPast && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-[#74777e]">Past</span>}
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${color}`}>{TYPE_LABELS[cycle.type]}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        {/* Cycle header */}
        <div className="rounded-lg border border-[#DCE3E8] bg-white p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-[#171c1f] tracking-tight">{cycle.name}</h1>
          <p className="text-sm text-[#74777e]">
            {new Date(cycle.startDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            {" — "}
            {new Date(cycle.endDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {totalCount > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#43474d]">{completedCount} of {totalCount} milestones completed</span>
                <span className="font-semibold text-[#171c1f]">{pct}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Milestones by goal */}
        {byGoal.size === 0 ? (
          <div className="rounded-lg border border-dashed border-[#DCE3E8] bg-white p-10 text-center space-y-2">
            <p className="text-sm text-[#74777e]">No milestones in this cycle yet.</p>
            <p className="text-xs text-[#74777e]">Go to a goal and add a milestone assigned to this cycle.</p>
            <Link href="/goals/new" className="inline-block mt-2 text-sm font-medium text-[#00152a] hover:underline">
              Create a goal →
            </Link>
          </div>
        ) : (
          Array.from(byGoal.values()).map(({ goal, milestones: ms }) => {
            const doneCount = ms.filter((m) => m.completedAt).length;
            return (
              <section key={goal.id} className="rounded-lg border border-[#DCE3E8] bg-white overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE3E8]">
                  <Link href={`/goals/${goal.id}`} className="flex items-center gap-2 hover:underline">
                    <span className="text-sm font-semibold text-[#171c1f]">{goal.title}</span>
                    {goal.workspaceType === "family" && (
                      <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">family</span>
                    )}
                  </Link>
                  <span className="text-xs text-[#74777e]">{doneCount}/{ms.length}</span>
                </div>
                <ul className="divide-y divide-[#DCE3E8]">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center gap-4 px-6 py-3">
                      <div className={`h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center ${
                        m.completedAt ? "border-emerald-500 bg-emerald-500" : "border-[#DCE3E8]"
                      }`}>
                        {m.completedAt && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm ${m.completedAt ? "text-[#74777e] line-through" : "text-[#171c1f]"}`}>
                        {m.title}
                      </span>
                      {m.description && (
                        <span className="text-xs text-[#74777e] max-w-xs truncate hidden sm:block">{m.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
