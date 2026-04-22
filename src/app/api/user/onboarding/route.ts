import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const completeOnboardingSchema = z.object({
  /**
   * Display name chosen during onboarding.
   * Optional — the user may already have a name from their OAuth provider.
   */
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be at most 100 characters")
    .optional(),
});

/**
 * POST /api/user/onboarding
 *
 * Marks the authenticated user's onboarding as completed and optionally
 * updates their display name.
 *
 * This endpoint is the single point of truth for "user has finished the
 * onboarding wizard". After a successful response, the middleware will
 * stop redirecting the user to /onboarding.
 *
 * Body: { name?: string }
 * Response: { user: { id, name, email, image, onboardingCompleted } }
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Empty body is fine — the name field is optional
    body = {};
  }

  const parsed = completeOnboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
      { status: 400 }
    );
  }

  const { name } = parsed.data;

  try {
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        onboardingCompleted: true,
        ...(name !== undefined && { name: name.trim() }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        onboardingCompleted: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("[POST /api/user/onboarding] Failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/onboarding
 *
 * Returns the onboarding status for the authenticated user.
 * Useful for client-side checks and redirect decisions.
 *
 * Response: { onboardingCompleted: boolean }
 */
export async function GET() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { onboardingCompleted: true },
    });

    return NextResponse.json({
      onboardingCompleted: dbUser?.onboardingCompleted ?? false,
    });
  } catch (error) {
    console.error("[GET /api/user/onboarding] Failed:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
