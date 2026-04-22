import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ habitId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { habitId } = await params;
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== session.user.id) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

  return NextResponse.json({ habit });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ habitId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { habitId } = await params;
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== session.user.id) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  const updated = await prisma.habit.update({
    where: { id: habitId },
    data: {
      title: typeof data.title === "string" ? data.title : habit.title,
      description: "description" in data ? (data.description as string | null) : habit.description,
      streakMode: typeof data.streakMode === "string" ? data.streakMode : habit.streakMode,
      percentageThreshold: typeof data.percentageThreshold === "number" ? data.percentageThreshold : habit.percentageThreshold,
      scheduledDays: Array.isArray(data.scheduledDays) ? JSON.stringify(data.scheduledDays) : habit.scheduledDays,
      isActive: typeof data.isActive === "boolean" ? data.isActive : habit.isActive,
    },
  });

  return NextResponse.json({ habit: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ habitId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { habitId } = await params;
  const habit = await prisma.habit.findUnique({ where: { id: habitId } });
  if (!habit || habit.userId !== session.user.id) return NextResponse.json({ error: "Habit not found." }, { status: 404 });

  // Soft-delete by deactivating
  await prisma.habit.update({ where: { id: habitId }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
