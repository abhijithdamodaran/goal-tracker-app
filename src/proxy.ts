/**
 * Next.js 16 Proxy (formerly middleware) — route-protection and onboarding guards.
 *
 * Auth rules:
 *   - PUBLIC_PATHS: accessible without a session (sign-in, verify, error pages, legal)
 *   - /api/auth/*: all NextAuth internal routes — always allowed
 *   - All other routes: require an active session
 *
 * Onboarding rules (applied after auth check):
 *   - NEW USER (onboardingCompleted === false):
 *     • Any non-onboarding route → redirect to /onboarding
 *     • /onboarding/* itself is allowed through
 *     • /api/* is allowed through so the wizard can call APIs
 *   - RETURNING USER (onboardingCompleted === true):
 *     • /onboarding → redirect to /dashboard (can't re-enter the wizard)
 *     • All other routes allowed through
 *
 * Unauthenticated requests to protected routes are redirected to /signin
 * with a `callbackUrl` parameter so the user lands back after signing in.
 *
 * Note: Proxy defaults to Node.js runtime in Next.js 16, so Prisma calls
 * inside the NextAuth session callback are fully supported here.
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Session } from "next-auth";

/** Routes accessible without authentication. */
const PUBLIC_PATHS: string[] = [
  "/signin",
  "/verify-request",
  "/auth-error",
  "/terms",
  "/privacy",
];

/** Prefix for NextAuth's internal API routes — always public. */
const AUTH_API_PREFIX = "/api/auth";

/** The onboarding wizard path prefix. */
const ONBOARDING_PREFIX = "/onboarding";

/** Where authenticated + onboarded users land by default. */
const DEFAULT_AUTHED_PATH = "/dashboard";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export const proxy = auth(
  (req: NextRequest & { auth: Session | null }) => {
    const { pathname } = req.nextUrl;

    // ── 1. Always allow Next.js internals and static assets ───────────────
    if (
      pathname.startsWith("/_next/") ||
      pathname.startsWith("/favicon") ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
    ) {
      return NextResponse.next();
    }

    // ── 2. Always allow NextAuth API routes ───────────────────────────────
    if (pathname.startsWith(AUTH_API_PREFIX)) {
      return NextResponse.next();
    }

    // ── 3. Allow public pages (no session required) ───────────────────────
    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    // ── 4. Everything else requires an active session ─────────────────────
    if (!req.auth) {
      const signInUrl = new URL("/signin", req.nextUrl.origin);
      // Preserve the intended destination so we can redirect back post-login.
      // Skip storing /onboarding as the callbackUrl — the onboarding flow
      // will redirect to /dashboard when it's done.
      if (!pathname.startsWith(ONBOARDING_PREFIX)) {
        signInUrl.searchParams.set("callbackUrl", pathname);
      }
      return NextResponse.redirect(signInUrl);
    }

    // ── 5. Authenticated — apply onboarding guards ────────────────────────
    const onboardingCompleted = req.auth.user?.onboardingCompleted ?? false;

    if (!onboardingCompleted) {
      // New user: funnel to onboarding wizard.
      // Allow /onboarding/* and /api/* (API calls during the wizard) through.
      if (
        pathname.startsWith(ONBOARDING_PREFIX) ||
        pathname.startsWith("/api/")
      ) {
        return NextResponse.next();
      }
      // Redirect everything else to onboarding
      return NextResponse.redirect(
        new URL(ONBOARDING_PREFIX, req.nextUrl.origin)
      );
    }

    // Returning user: prevent re-entering the wizard
    if (
      pathname === ONBOARDING_PREFIX ||
      pathname.startsWith(`${ONBOARDING_PREFIX}/`)
    ) {
      return NextResponse.redirect(
        new URL(DEFAULT_AUTHED_PATH, req.nextUrl.origin)
      );
    }

    return NextResponse.next();
  }
);

/**
 * Matcher: run proxy on all routes except static files and images.
 * NextAuth internal API routes are handled inside the function above
 * rather than excluded here so that custom logic can still inspect them.
 */
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *  - _next/static  (static files)
     *  - _next/image   (image optimisation)
     *  - favicon.ico
     *  - public folder files (*.svg, *.png, *.jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
