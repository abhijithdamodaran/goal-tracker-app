import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { computeSmartScore } from "@/lib/smart-score";
import GoalDetailClient from "./GoalDetailClient";

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const { id } = await params;
  const userId = session.user.id;

  const goal = await prisma.goal.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, image: true, email: true } } },
  });

  if (!goal || goal.archivedAt) notFound();

  // Check access
  let hasAccess = goal.ownerId === userId;
  if (!hasAccess && goal.workspaceType === "family" && goal.workspaceId) {
    const membership = await prisma.familyMember.findFirst({
      where: { userId, workspaceId: goal.workspaceId },
    });
    hasAccess = !!membership;
  }
  if (!hasAccess) notFound();

  const smart = computeSmartScore({
    title: goal.title,
    description: goal.description ?? undefined,
    metric: goal.metric ?? undefined,
    targetValue: goal.targetValue ?? undefined,
    unit: goal.unit ?? undefined,
    reflection: goal.reflection ?? undefined,
    deadline: goal.deadline,
  });

  // Serialise for client component
  const serialized = {
    ...goal,
    deadline: goal.deadline?.toISOString() ?? null,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    archivedAt: null,
  };

  return <GoalDetailClient goal={serialized} smart={smart} isOwner={goal.ownerId === userId} />;
}
