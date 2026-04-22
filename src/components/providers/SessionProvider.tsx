"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

interface Props {
  children: React.ReactNode;
}

/**
 * Client-side session provider that wraps the app to make
 * useSession() available in client components.
 */
export function SessionProvider({ children }: Props) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
