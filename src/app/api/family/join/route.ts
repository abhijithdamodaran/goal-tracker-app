import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { joinFamilySchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.familyMember.findFirst({
      where: { userId: user.id },
    });
    if (existing) {
      return NextResponse.json(
        { error: "You already belong to a family workspace" },
        { status: 409 }
      );
    }

    const body = await request.json();
    const result = joinFamilySchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid invite code", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { code } = result.data;
    const invite = await prisma.inviteCode.findUnique({
      where: { code },
      include: { workspace: true },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite code not found" }, { status: 404 });
    }
    if (invite.usedAt) {
      return NextResponse.json({ error: "Invite code has already been used" }, { status: 410 });
    }
    if (invite.expiresAt < new Date()) {
      return NextResponse.json({ error: "Invite code has expired" }, { status: 410 });
    }

    await prisma.$transaction([
      prisma.familyMember.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: "member",
        },
      }),
      prisma.inviteCode.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      workspace: invite.workspace,
      message: `You've joined the ${invite.workspace.name} family workspace!`,
    });
  } catch (error) {
    console.error("Failed to join family workspace:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
