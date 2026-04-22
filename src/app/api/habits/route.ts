import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1, "Title is required.").max(120),
  description: z.string().max(500).optional(),
  streakMode: z.enum(["strict", "one-grace-per-week", "percentage-threshold"]).default("strict"),
  percentageThreshold: z.number().min(0.01).max(1).default(0.8),
  scheduledDays: z.array(z.number().int().min(0).max(6)).min(1).default([0, 1, 2, 3, 4, 5, 6]),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const habits = await prisma.habit.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ habits });
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

  const { title, description, streakMode, percentageThreshold, scheduledDays } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { timezone: true } });

  const habit = await prisma.habit.create({
    data: {
      title,
      description: description ?? null,
      streakMode,
      percentageThreshold,
      scheduledDays: JSON.stringify(scheduledDays),
      timezone: user?.timezone ?? "UTC",
      userId: session.user.id,
    },
  });

  return NextResponse.json({ habit }, { status: 201 });
}
