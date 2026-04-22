import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

/**
 * NextAuth v5 instance with Prisma adapter for database sessions.
 *
 * Exports:
 *  - handlers: GET/POST route handlers for /api/auth/*
 *  - auth: server-side session accessor
 *  - signIn / signOut: programmatic sign-in/out helpers
 *
 * Session callback augments the default session with:
 *  - user.id: database UUID for downstream use
 *  - user.onboardingCompleted: drives the post-signup onboarding redirect;
 *    false for new users, true once they finish the onboarding wizard.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,

    async jwt({ token, user, trigger }) {
      // On initial sign-in, `user` is populated — persist id to token.
      if (user?.id) {
        token.id = user.id;
      }
      // Re-fetch onboardingCompleted on sign-in or explicit refresh.
      if (user?.id || trigger === "update") {
        const userId = (user?.id ?? token.id) as string;
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { onboardingCompleted: true },
        });
        token.onboardingCompleted = dbUser?.onboardingCompleted ?? false;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.onboardingCompleted = (token.onboardingCompleted as boolean) ?? false;
      }
      return session;
    },
  },
});

/**
 * Get the current authenticated user from the session.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user;
}
