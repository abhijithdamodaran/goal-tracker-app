import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * Root page — smart entry-point redirect.
 *
 * This server component runs after the middleware has already verified auth,
 * so by the time we reach here the user is guaranteed to be authenticated
 * (unauthenticated requests are redirected to /signin by the middleware).
 *
 * Logic:
 *  - Not signed in          → /signin    (shouldn't happen — middleware guards this)
 *  - onboardingCompleted = false → /onboarding  (shouldn't happen — middleware redirects there)
 *  - onboardingCompleted = true  → /dashboard   (normal returning user)
 *
 * The server component provides defence-in-depth on top of the middleware
 * guards so that any edge case (e.g. a stale session cookie) is handled
 * gracefully without an infinite redirect loop.
 */
export default async function HomePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  if (!session.user.onboardingCompleted) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
