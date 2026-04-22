import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import Nodemailer from "next-auth/providers/nodemailer";
import Credentials from "next-auth/providers/credentials";
import { sendVerificationRequest } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Providers:
 *  - Google SSO  → needs GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
 *  - Apple SSO   → needs APPLE_CLIENT_ID + APPLE_CLIENT_SECRET (JWT)
 *                  Run `node scripts/generate-apple-secret.mjs` to create the JWT
 *                  from your Apple private key, key ID, and team ID.
 *  - Magic link  → passwordless email via Nodemailer
 *                  Needs EMAIL_SERVER + EMAIL_FROM; dev falls back to console.
 *
 * All three providers are always registered. If an env var is missing the
 * provider will simply fail at runtime (Auth.js handles this gracefully with
 * a "Configuration" error), so we use the non-null assertion (!) here to
 * satisfy TypeScript while keeping the runtime behaviour correct.
 *
 * Redirect URIs to register in each provider's developer console:
 *  - Google: https://YOUR_DOMAIN/api/auth/callback/google
 *  - Apple:  https://YOUR_DOMAIN/api/auth/callback/apple
 *            (Apple does not allow http:// or localhost — use a tunnel like
 *             ngrok or deploy to a staging server for local Apple SSO testing)
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_CLIENT_SECRET!,
    }),
    Nodemailer({
      server: process.env.EMAIL_SERVER || "smtp://localhost:1025",
      from: process.env.EMAIL_FROM || "GoalTracker <noreply@goaltracker.app>",
      // Custom sendVerificationRequest: branded HTML email + dev console fallback.
      // When EMAIL_SERVER is localhost or unset, the link is printed to stdout
      // so local development requires no SMTP server.
      sendVerificationRequest,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
          select: { id: true, name: true, email: true, image: true, password: true, onboardingCompleted: true },
        });
        if (!user?.password) return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email, image: user.image, onboardingCompleted: user.onboardingCompleted };
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  session: {
    strategy: "jwt",
  },
};
