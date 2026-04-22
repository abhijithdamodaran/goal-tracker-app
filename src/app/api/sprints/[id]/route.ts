import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function authorize(userId: string, sprintId: string) {
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return null;
  if (sprint.workspaceType === "personal") return sprint.ownerId === userId ? sprint : null;
  const m = await prisma.familyMember.findFirst({ where: { userId, workspaceId: sprint.workspaceId! } });
  return m ? sprint : null;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const sprint = await authorize(session.user.id, id);
  if (!sprint) return NextResponse.json({ error: "Sprint not found." }, { status: 404 });

  const full = await prisma.sprint.findUnique({
    where: { id },
    include: {
      actionItems: {
        include: {
          milestone: { select: { id: true, title: true, goalId: true, goal: { select: { id: true, title: true } } } },
          assignee: { select: { id: true, name: true, image: true } },
        },
        orderBy: [{ done: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  return NextResponse.json({ sprint: full });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { id } = await params;
  const existing = await authorize(session.user.id, id);
  if (!existing) return NextResponse.json({ error: "Sprint not found." }, { status: 404 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;

  const sprint = await prisma.sprint.update({
    where: { id },
    data: {
      name: typeof data.name === "string" ? data.name : existing.name,
      reviewedAt: data.reviewedAt === null ? null : data.reviewedAt ? new Date(data.reviewedAt as string) : existing.reviewedAt,
    },
  });

  return NextResponse.json({ sprint });
}
