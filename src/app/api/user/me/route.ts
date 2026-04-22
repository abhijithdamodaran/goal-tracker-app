import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/me
 *
 * Returns the authenticated user's profile along with their family
 * workspace membership (if any). Used by the client to hydrate the
 * session with workspace context.
 *
 * Response shape:
 * {
 *   user: { id, name, email, image, createdAt },
 *   familyWorkspace: {
 *     id, name, role,
 *     members: [{ id, name, email, image, role }]
 *   } | null
 * }
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        familyMemberships: {
          include: {
            workspace: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Flatten the family workspace membership for easier consumption
    const membership = dbUser.familyMemberships[0] ?? null;
    const familyWorkspace = membership
      ? {
          id: membership.workspace.id,
          name: membership.workspace.name,
          role: membership.role,
          members: membership.workspace.members.map((m) => ({
            id: m.user.id,
            name: m.user.name,
            email: m.user.email,
            image: m.user.image,
            role: m.role,
          })),
        }
      : null;

    return NextResponse.json({
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        image: dbUser.image,
        createdAt: dbUser.createdAt,
      },
      familyWorkspace,
    });
  } catch (error) {
    console.error("[GET /api/user/me] Failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/me
 *
 * Allows the authenticated user to update their display name and avatar URL.
 *
 * Request body: { name?: string; image?: string }
 */
export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, image } = body;

  // Validate inputs
  if (name !== undefined && (typeof name !== "string" || name.trim().length === 0 || name.length > 100)) {
    return NextResponse.json(
      { error: "Name must be a non-empty string of at most 100 characters." },
      { status: 400 }
    );
  }

  if (image !== undefined && typeof image !== "string") {
    return NextResponse.json({ error: "Image must be a string URL." }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(image !== undefined && { image }),
      },
      select: { id: true, name: true, email: true, image: true, createdAt: true },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[PATCH /api/user/me] Failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
