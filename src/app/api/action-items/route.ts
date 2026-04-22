import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const excludeSprintId = searchParams.get("excludeSprintId");
  const milestoneId = searchParams.get("milestoneId");

  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);

  const items = await prisma.actionItem.findMany({
    where: {
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
      ...(milestoneId !== null ? { milestoneId } : {}),
      ...(excludeSprintId ? { NOT: { sprintId: excludeSprintId } } : {}),
    },
    include: {
      milestone: { select: { id: true, title: true, goal: { select: { id: true, title: true } } } },
      sprint: { select: { id: true, name: true } },
    },
    orderBy: [{ done: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items });
}

const createSchema = z.object({
  title: z.string().min(1, "Title is required.").max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime({ offset: true }).optional().nullable(),
  milestoneId: z.string().optional().nullable(),
  sprintId: z.string().optional().nullable(),
  workspaceType: z.enum(["personal", "family"]).default("personal"),
  workspaceId: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const { title, description, dueDate, milestoneId, sprintId, workspaceType, workspaceId } = parsed.data;
  const userId = session.user.id;

  // Validate milestone access if provided
  if (milestoneId) {
    const ms = await prisma.milestone.findUnique({ where: { id: milestoneId }, include: { goal: true } });
    if (!ms) return NextResponse.json({ error: "Milestone not found." }, { status: 404 });
    const goal = ms.goal;
    if (goal.workspaceType === "personal" && goal.ownerId !== userId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (goal.workspaceType === "family") {
      const m = await prisma.familyMember.findFirst({ where: { userId, workspaceId: goal.workspaceId! } });
      if (!m) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const item = await prisma.actionItem.create({
    data: {
      title,
      description: description ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
      milestoneId: milestoneId ?? null,
      sprintId: sprintId ?? null,
      workspaceType,
      workspaceId: workspaceType === "family" ? workspaceId : null,
      ownerId: userId,
    },
    include: {
      milestone: { select: { id: true, title: true } },
      sprint: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
