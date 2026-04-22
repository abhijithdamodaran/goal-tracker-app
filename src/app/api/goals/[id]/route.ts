import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { computeSmartScore } from "@/lib/smart-score";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  metric: z.string().max(100).optional().nullable(),
  targetValue: z.number().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  reflection: z.string().max(2000).optional().nullable(),
  deadline: z.string().datetime({ offset: true }).optional().nullable(),
});

async function authorize(userId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.archivedAt) return null;

  if (goal.workspaceType === "personal") {
    return goal.ownerId === userId ? goal : null;
  }
  // Family goal — any member of the workspace can edit
  const membership = await prisma.familyMember.findFirst({
    where: { userId, workspaceId: goal.workspaceId! },
  });
  return membership ? goal : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const goal = await authorize(session.user.id, id);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const full = await prisma.goal.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ goal: full });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const data = parsed.data;

  const merged = {
    title: data.title ?? existing.title,
    description: "description" in data ? data.description : existing.description,
    metric: "metric" in data ? data.metric : existing.metric,
    targetValue: "targetValue" in data ? data.targetValue : existing.targetValue,
    unit: "unit" in data ? data.unit : existing.unit,
    reflection: "reflection" in data ? data.reflection : existing.reflection,
    deadline: "deadline" in data ? (data.deadline ? new Date(data.deadline) : null) : existing.deadline,
  };

  const { score } = computeSmartScore(merged);

  const goal = await prisma.goal.update({
    where: { id },
    data: { ...merged, smartScore: score },
    include: { owner: { select: { id: true, name: true, image: true } } },
  });

  return NextResponse.json({ goal });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  await prisma.goal.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ success: true });
}
