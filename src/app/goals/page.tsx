import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function GoalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const familyIds = memberships.map((m) => m.workspaceId);

  const goals = await prisma.goal.findMany({
    where: {
      archivedAt: null,
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
    include: {
      owner: { select: { id: true, name: true } },
      milestones: { where: { completedAt: null }, select: { id: true } },
      _count: { select: { milestones: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-[#f6fafe]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-[#DCE3E8] px-6 h-14 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-[#171c1f]">Goals</h1>
        <Link
          href="/goals/new"
          className="inline-flex items-center gap-1.5 bg-[#00152a] text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-[#102a43] transition-colors"
        >
          + New goal
        </Link>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#171c1f] tracking-tight">Active Goals</h2>
          <p className="text-sm text-[#43474d] mt-1">
            {goals.length > 0 ? `${goals.length} goal${goals.length !== 1 ? "s" : ""} in progress` : "No active goals yet"}
          </p>
        </div>

        {goals.length === 0 ? (
          <div className="border border-dashed border-[#DCE3E8] bg-white rounded-lg py-16 text-center">
            <p className="text-sm text-[#74777e]">No goals yet.</p>
            <Link href="/goals/new" className="mt-2 inline-block text-sm font-medium text-[#00152a] hover:underline">
              Create your first goal →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const totalMilestones = goal._count.milestones;
              const openMilestones = goal.milestones.length;
              const completedMilestones = totalMilestones - openMilestones;
              const pct = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

              const scoreColor =
                goal.smartScore >= 4 ? "bg-emerald-50 text-emerald-700" :
                goal.smartScore >= 2 ? "bg-amber-50 text-amber-700" :
                "bg-slate-100 text-[#74777e]";

              return (
                <Link
                  key={goal.id}
                  href={`/goals/${goal.id}`}
                  className="group bg-white border border-[#DCE3E8] p-5 rounded-lg hover:border-slate-400 transition-colors block"
                >
                  {/* Category chip + title */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${
                        goal.workspaceType === "family"
                          ? "bg-purple-50 text-purple-600"
                          : "bg-slate-100 text-[#43474d]"
                      }`}>
                        {goal.workspaceType === "family" ? "Family" : "Personal"}
                      </span>
                      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded ${scoreColor}`}>
                        {goal.smartScore}/5
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-[#171c1f] leading-snug">{goal.title}</h2>
                  </div>

                  {/* Description */}
                  {goal.description && (
                    <p className="text-xs text-[#43474d] mb-4 line-clamp-2 leading-relaxed">{goal.description}</p>
                  )}

                  {/* Progress */}
                  {totalMilestones > 0 ? (
                    <div className="mb-4">
                      <div className="flex justify-between items-center text-[10px] mb-1.5">
                        <span className="text-[#74777e] font-medium uppercase tracking-wide">Milestone progress</span>
                        <span className="font-bold text-[#171c1f]">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-[#00152a]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#74777e] mt-1">{completedMilestones}/{totalMilestones} milestones</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-[#74777e] mb-4">No milestones yet</p>
                  )}

                  {/* Deadline */}
                  {goal.deadline && (
                    <div className="flex items-center gap-1 text-[10px] text-[#74777e]">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                      {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </div>
                  )}
                </Link>
              );
            })}

            {/* Add new goal card */}
            <Link
              href="/goals/new"
              className="bg-white border border-dashed border-[#DCE3E8] p-5 rounded-lg flex flex-col items-center justify-center gap-2 hover:border-slate-400 hover:bg-slate-50 transition-colors min-h-[160px]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dashed border-slate-300">
                <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <span className="text-xs font-medium text-[#74777e]">Add a new goal</span>
              <span className="text-[10px] text-slate-400 text-center">Define exactly what you want to achieve for the best sprint.</span>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
