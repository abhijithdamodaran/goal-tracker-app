import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function authorize(userId: string, itemId: string) {
  const item = await prisma.actionItem.findUnique({ where: { id: itemId } });
  if (!item) return null;
  if (item.workspaceType === "personal") return item.ownerId === userId ? item : null;
  if (!item.workspaceId) return null;
  const m = await prisma.familyMember.findFirst({ where: { userId, workspaceId: item.workspaceId } });
  return m ? item : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Action item not found." }, { status: 404 });

  const item = await prisma.actionItem.findUnique({
    where: { id },
    include: {
      milestone: { select: { id: true, title: true, goal: { select: { id: true, title: true } } } },
      sprint: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ item });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Action item not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  const item = await prisma.actionItem.update({
    where: { id },
    data: {
      title: typeof data.title === "string" ? data.title : existing.title,
      description: "description" in data ? (data.description as string | null) : existing.description,
      dueDate: "dueDate" in data ? (data.dueDate ? new Date(data.dueDate as string) : null) : existing.dueDate,
      done: typeof data.done === "boolean" ? data.done : existing.done,
      sprintId: "sprintId" in data ? (data.sprintId as string | null) : existing.sprintId,
    },
    include: {
      milestone: { select: { id: true, title: true } },
      sprint: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ item });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Action item not found." }, { status: 404 });

  await prisma.actionItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
