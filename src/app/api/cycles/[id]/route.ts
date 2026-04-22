import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function authorize(userId: string, cycleId: string) {
  const cycle = await prisma.cycle.findUnique({ where: { id: cycleId } });
  if (!cycle) return null;
  if (cycle.workspaceType === "personal") return cycle.ownerId === userId ? cycle : null;
  const membership = await prisma.familyMember.findFirst({ where: { userId, workspaceId: cycle.workspaceId! } });
  return membership ? cycle : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const cycle = await authorize(session.user.id, id);
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  const full = await prisma.cycle.findUnique({
    where: { id },
    include: {
      milestones: {
        include: { goal: { select: { id: true, title: true, smartScore: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ cycle: full });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(["monthly", "quarterly", "half-yearly", "yearly"]).optional(),
  startDate: z.string().datetime({ offset: true }).optional(),
  endDate: z.string().datetime({ offset: true }).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });

  const data = parsed.data;
  const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
  const endDate = data.endDate ? new Date(data.endDate) : existing.endDate;

  if (startDate >= endDate) return NextResponse.json({ error: "End date must be after start date." }, { status: 400 });

  const cycle = await prisma.cycle.update({
    where: { id },
    data: {
      name: data.name ?? existing.name,
      type: data.type ?? existing.type,
      startDate,
      endDate,
    },
  });

  return NextResponse.json({ cycle });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  await prisma.cycle.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
