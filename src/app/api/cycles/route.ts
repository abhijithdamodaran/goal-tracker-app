import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const cycleSchema = z.object({
  name: z.string().min(1, "Name is required.").max(100),
  type: z.enum(["monthly", "quarterly", "half-yearly", "yearly"]),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  workspaceType: z.enum(["personal", "family"]).default("personal"),
  workspaceId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const userId = session.user.id;
  const memberships = await prisma.familyMember.findMany({ where: { userId }, select: { workspaceId: true } });
  const familyIds = memberships.map((m) => m.workspaceId);

  const cycles = await prisma.cycle.findMany({
    where: {
      OR: [
        { ownerId: userId, workspaceType: "personal" },
        { workspaceType: "family", workspaceId: { in: familyIds } },
      ],
    },
    include: { _count: { select: { milestones: true } } },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json({ cycles });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = cycleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  const { name, type, startDate, endDate, workspaceType, workspaceId } = parsed.data;

  if (new Date(startDate) >= new Date(endDate)) {
    return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });
  }

  if (workspaceType === "family") {
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required for family cycles." }, { status: 400 });
    const membership = await prisma.familyMember.findFirst({ where: { userId: session.user.id, workspaceId } });
    if (!membership) return NextResponse.json({ error: "Not a member of this workspace." }, { status: 403 });
  }

  const cycle = await prisma.cycle.create({
    data: {
      name,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      workspaceType,
      workspaceId: workspaceType === "family" ? workspaceId : null,
      ownerId: session.user.id,
    },
  });

  return NextResponse.json({ cycle }, { status: 201 });
}
