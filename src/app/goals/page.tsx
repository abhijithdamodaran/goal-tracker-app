import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

function SmartBadge({ score }: { score: number }) {
  const color =
    score >= 4 ? "bg-green-100 text-green-700" :
    score >= 2 ? "bg-yellow-100 text-yellow-700" :
    "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
      SMART {score}/5
    </span>
  );
}

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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Goals</h1>
          <Link href="/goals/new" className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700">
            + New goal
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {goals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center">
            <p className="text-gray-500">No goals yet.</p>
            <Link href="/goals/new" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
              Create your first goal →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {goals.map((goal) => {
              const totalMilestones = goal._count.milestones;
              const openMilestones = goal.milestones.length;
              const completedMilestones = totalMilestones - openMilestones;
              const progress = totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0;

              return (
                <li key={goal.id}>
                  <Link
                    href={`/goals/${goal.id}`}
                    className="block rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-gray-900 truncate">{goal.title}</h2>
                        {goal.description && (
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <SmartBadge score={goal.smartScore} />
                        {goal.workspaceType === "family" && (
                          <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                            Family
                          </span>
                        )}
                      </div>
                    </div>

                    {totalMilestones > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                          <span>{completedMilestones}/{totalMilestones} milestones</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-gray-100">
                          <div
                            className={`h-1.5 rounded-full ${progress === 100 ? "bg-green-500" : "bg-blue-500"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {goal.deadline && (
                      <p className="mt-2 text-xs text-gray-400">
                        Due {new Date(goal.deadline).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
