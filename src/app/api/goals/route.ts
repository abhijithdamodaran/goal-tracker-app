import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeSmartScore } from "@/lib/smart-score";

const goalSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(2000).optional(),
  metric: z.string().max(100).optional(),
  targetValue: z.number().optional(),
  unit: z.string().max(50).optional(),
  reflection: z.string().max(2000).optional(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
  workspaceType: z.enum(["personal", "family"]).default("personal"),
  workspaceId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const userId = session.user.id;

  // Get user's family workspace IDs
  const memberships = await prisma.familyMember.findMany({
    where: { userId },
    select: { workspaceId: true },
  });
  const familyWorkspaceIds = memberships.map((m) => m.workspaceId);

  const goals = await prisma.goal.findMany({
    where: {
      archivedAt: null,
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyWorkspaceIds } },
      ],
    },
    include: { owner: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ goals });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = goalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { title, description, metric, targetValue, unit, reflection, deadline, workspaceType, workspaceId } = parsed.data;

  // Validate family workspace ownership if claiming family goal
  if (workspaceType === "family") {
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required for family goals." }, { status: 400 });
    }
    const membership = await prisma.familyMember.findFirst({
      where: { userId: session.user.id, workspaceId },
    });
    if (!membership) {
      return NextResponse.json({ error: "You are not a member of this workspace." }, { status: 403 });
    }
  }

  const { score } = computeSmartScore({
    title,
    description,
    metric,
    targetValue,
    unit,
    reflection,
    deadline,
  });

  const goal = await prisma.goal.create({
    data: {
      title,
      description: description ?? null,
      metric: metric ?? null,
      targetValue: targetValue ?? null,
      unit: unit ?? null,
      reflection: reflection ?? null,
      deadline: deadline ? new Date(deadline) : null,
      smartScore: score,
      workspaceType,
      workspaceId: workspaceType === "family" ? workspaceId : null,
      ownerId: session.user.id,
    },
    include: { owner: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ goal }, { status: 201 });
}
