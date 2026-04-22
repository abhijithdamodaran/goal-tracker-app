import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function authorizeGoal(userId: string, goalId: string) {
  const goal = await prisma.goal.findUnique({ where: { id: goalId } });
  if (!goal || goal.archivedAt) return null;
  if (goal.workspaceType === "personal") return goal.ownerId === userId ? goal : null;
  const membership = await prisma.familyMember.findFirst({ where: { userId, workspaceId: goal.workspaceId! } });
  return membership ? goal : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const goal = await authorizeGoal(session.user.id, id);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  const milestones = await prisma.milestone.findMany({
    where: { goalId: id },
    include: {
      cycle: { select: { id: true, name: true, type: true, startDate: true, endDate: true } },
      actionItems: {
        orderBy: [{ done: "asc" }, { createdAt: "asc" }],
        include: { sprint: { select: { id: true, name: true } } },
      },
    },
    orderBy: [{ cycle: { startDate: "asc" } }, { createdAt: "asc" }],
  });

  return NextResponse.json({ milestones });
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(2000).optional(),
  cycleId: z.string().min(1, "Cycle is required."),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const goal = await authorizeGoal(session.user.id, id);
  if (!goal) return NextResponse.json({ error: "Goal not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const { title, description, cycleId } = parsed.data;

  // Verify cycle is accessible by this user
  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);
  const cycle = await prisma.cycle.findFirst({
    where: {
      id: cycleId,
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  const milestone = await prisma.milestone.create({
    data: { title, description: description ?? null, goalId: id, cycleId },
    include: { cycle: { select: { id: true, name: true, type: true, startDate: true, endDate: true } } },
  });

  return NextResponse.json({ milestone }, { status: 201 });
}
