import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function authorize(userId: string, milestoneId: string) {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { goal: true },
  });
  if (!milestone) return null;

  const goal = milestone.goal;
  if (goal.workspaceType === "personal") return goal.ownerId === userId ? milestone : null;
  const membership = await prisma.familyMember.findFirst({ where: { userId, workspaceId: goal.workspaceId! } });
  return membership ? milestone : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const ms = await authorize(session.user.id, id);
  if (!ms) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

  const full = await prisma.milestone.findUnique({
    where: { id },
    include: {
      goal: { select: { id: true, title: true, workspaceType: true } },
      cycle: { select: { id: true, name: true, type: true, startDate: true, endDate: true } },
      actionItems: {
        include: { sprint: { select: { id: true, name: true } } },
        orderBy: [{ done: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return NextResponse.json({ milestone: full });
}

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  cycleId: z.string().optional(),
  completedAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const data = parsed.data;

  const milestone = await prisma.milestone.update({
    where: { id },
    data: {
      title: data.title ?? existing.title,
      description: "description" in data ? data.description : existing.description,
      cycleId: data.cycleId ?? existing.cycleId,
      completedAt: "completedAt" in data
        ? (data.completedAt ? new Date(data.completedAt) : null)
        : existing.completedAt,
    },
    include: { cycle: { select: { id: true, name: true, type: true, startDate: true, endDate: true } } },
  });

  return NextResponse.json({ milestone });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });

  await prisma.milestone.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
