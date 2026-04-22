import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { randomBytes } from "crypto";

function generateCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.familyMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true, role: true },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of a family workspace" },
        { status: 404 }
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only owners and admins can generate invite codes" },
        { status: 403 }
      );
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const code = await prisma.inviteCode.create({
      data: {
        code: generateCode(),
        workspaceId: membership.workspaceId,
        createdById: user.id,
        expiresAt,
      },
    });

    return NextResponse.json(
      { code: code.code, expiresAt: code.expiresAt },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to generate invite code:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
