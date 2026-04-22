import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

function sprintName(startDate: Date): string {
  return `Week of ${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

const createSchema = z.object({
  startDate: z.string().datetime({ offset: true }),
  workspaceType: z.enum(["personal", "family"]).default("personal"),
  workspaceId: z.string().optional().nullable(),
  name: z.string().max(100).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);

  const sprints = await prisma.sprint.findMany({
    where: {
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
    include: { _count: { select: { actionItems: true } } },
    orderBy: { startDate: "desc" },
  });

  return NextResponse.json({ sprints });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const { startDate, workspaceType, workspaceId, name } = parsed.data;

  const start = new Date(startDate);
  // Force to Monday (ISO week start)
  const dow = start.getDay();
  const daysBack = (dow + 6) % 7;
  start.setDate(start.getDate() - daysBack);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  if (workspaceType === "family") {
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required for family sprints." }, { status: 400 });
    const m = await prisma.familyMember.findFirst({ where: { userId: session.user.id, workspaceId } });
    if (!m) return NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 });
  }

  // Prevent duplicate sprints for the same week + workspace
  const existing = await prisma.sprint.findFirst({
    where: {
      ownerId: session.user.id,
      startDate: start,
      workspaceType,
      workspaceId: workspaceType === "family" ? workspaceId : null,
    },
  });
  if (existing) return NextResponse.json({ sprint: existing }, { status: 200 });

  const sprint = await prisma.sprint.create({
    data: {
      name: name ?? sprintName(start),
      startDate: start,
      endDate: end,
      workspaceType,
      workspaceId: workspaceType === "family" ? workspaceId : null,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json({ sprint }, { status: 201 });
}
