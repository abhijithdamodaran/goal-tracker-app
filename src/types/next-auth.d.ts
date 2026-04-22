/**
 * NextAuth v5 type augmentations for GoalTracker.
 *
 * Extends the built-in Session and User types so that
 * `session.user.id` is always available server-side and
 * in `useSession()` client-side without casts.
 */

import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      /** Database user ID (UUID) */
      id: string;
      /**
       * Whether the user has completed the post-signup onboarding wizard.
       * False for brand-new users; true once they finish onboarding.
       */
      onboardingCompleted: boolean;
      /** Preferred home screen: "today" | "sprint" | "dashboard" */
      homeScreen: string;
    } & DefaultSession["user"];
  }

  interface User {
    /** Database user ID (UUID) */
    id: string;
    onboardingCompleted: boolean;
    homeScreen: string;
  }
}
