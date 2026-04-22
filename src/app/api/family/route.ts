import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { createFamilyWorkspaceSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already belongs to a family workspace
    const existingMembership = await prisma.familyMember.findFirst({
      where: { userId: user.id },
      include: { workspace: true },
    });

    if (existingMembership) {
      return NextResponse.json(
        {
          error: "You already belong to a family workspace",
          workspace: existingMembership.workspace,
        },
        { status: 409 }
      );
    }

    const body = await request.json();
    const result = createFamilyWorkspaceSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { familyName } = result.data;

    // Check if family name is already taken
    const existingWorkspace = await prisma.familyWorkspace.findUnique({
      where: { name: familyName },
    });

    if (existingWorkspace) {
      return NextResponse.json(
        { error: "A family workspace with this name already exists. Please choose a different name." },
        { status: 409 }
      );
    }

    // Create workspace and add creator as owner in a transaction
    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.familyWorkspace.create({
        data: { name: familyName },
      });

      await tx.familyMember.create({
        data: {
          userId: user.id,
          workspaceId: ws.id,
          role: "owner",
        },
      });

      return ws;
    });

    return NextResponse.json(
      {
        workspace,
        message: `Family workspace "${familyName}" created successfully!`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create family workspace:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.familyMember.findFirst({
      where: { userId: user.id },
      select: { workspaceId: true, role: true },
    });
    if (!membership) return NextResponse.json({ error: "Not in a family workspace" }, { status: 404 });
    if (membership.role !== "owner" && membership.role !== "admin") {
      return NextResponse.json({ error: "Only owners and admins can rename the workspace" }, { status: 403 });
    }

    const body = await request.json();
    const result = createFamilyWorkspaceSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: "Validation failed", details: result.error.flatten().fieldErrors }, { status: 400 });
    }

    const workspace = await prisma.familyWorkspace.update({
      where: { id: membership.workspaceId },
      data: { name: result.data.familyName },
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Failed to rename family workspace:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.familyMember.findFirst({
      where: { userId: user.id },
      include: { workspace: { include: { members: true } } },
    });
    if (!membership) return NextResponse.json({ error: "Not in a family workspace" }, { status: 404 });

    const isOwner = membership.role === "owner";
    const otherMembers = membership.workspace.members.filter((m) => m.userId !== user.id);

    if (isOwner && otherMembers.length > 0) {
      return NextResponse.json(
        { error: "Transfer ownership before leaving, or remove all other members first." },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.familyMember.delete({ where: { id: membership.id } });
      // If owner was last member, delete the workspace too
      if (isOwner && otherMembers.length === 0) {
        await tx.familyWorkspace.delete({ where: { id: membership.workspaceId } });
      }
    });

    return NextResponse.json({ message: "You have left the family workspace." });
  } catch (error) {
    console.error("Failed to leave family workspace:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.familyMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ workspace: null });
    }

    return NextResponse.json({
      workspace: membership.workspace,
      role: membership.role,
    });
  } catch (error) {
    console.error("Failed to fetch family workspace:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
