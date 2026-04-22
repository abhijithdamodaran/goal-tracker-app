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
  monthly: "bg-blue-100 text-blue-700",
  quarterly: "bg-purple-100 text-purple-700",
  "half-yearly": "bg-orange-100 text-orange-700",
  yearly: "bg-green-100 text-green-700",
};

export default async function CycleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const userId = session.user.id;

  const cycle = await prisma.cycle.findUnique({ where: { id } });
  if (!cycle) notFound();

  // Check access
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

  // Group by goal
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

  const color = TYPE_COLORS[cycle.type] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/cycles" className="text-sm text-gray-500 hover:text-gray-700">← Cycles</Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700 truncate max-w-40">{cycle.name}</span>
          </div>
          <div className="flex items-center gap-2">
            {isActive && <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">Active</span>}
            {isPast && <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">Past</span>}
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>{TYPE_LABELS[cycle.type]}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Cycle header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-2xl font-bold text-gray-900">{cycle.name}</h1>
          <p className="text-sm text-gray-500">
            {new Date(cycle.startDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            {" — "}
            {new Date(cycle.endDate).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </p>
          {totalCount > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{completedCount} of {totalCount} milestones completed</span>
                <span className="font-semibold text-gray-900">{pct}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={`h-2 rounded-full transition-all ${pct === 100 ? "bg-green-500" : "bg-blue-500"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Milestones by goal */}
        {byGoal.size === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center space-y-2">
            <p className="text-sm text-gray-500">No milestones in this cycle yet.</p>
            <p className="text-xs text-gray-400">Go to a goal and add a milestone assigned to this cycle.</p>
            <Link href="/goals/new" className="inline-block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700">
              Create a goal →
            </Link>
          </div>
        ) : (
          Array.from(byGoal.values()).map(({ goal, milestones: ms }) => {
            const doneCount = ms.filter((m) => m.completedAt).length;
            return (
              <section key={goal.id} className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <Link href={`/goals/${goal.id}`} className="flex items-center gap-2 hover:underline">
                    <span className="font-semibold text-gray-900">{goal.title}</span>
                    {goal.workspaceType === "family" && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">family</span>
                    )}
                  </Link>
                  <span className="text-sm text-gray-500">{doneCount}/{ms.length}</span>
                </div>
                <ul className="divide-y divide-gray-100">
                  {ms.map((m) => (
                    <li key={m.id} className="flex items-center gap-4 px-6 py-3">
                      <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                        m.completedAt ? "border-green-500 bg-green-500" : "border-gray-300"
                      }`}>
                        {m.completedAt && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm ${m.completedAt ? "text-gray-400 line-through" : "text-gray-800"}`}>
                        {m.title}
                      </span>
                      {m.description && (
                        <span className="text-xs text-gray-400 max-w-xs truncate hidden sm:block">{m.description}</span>
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
