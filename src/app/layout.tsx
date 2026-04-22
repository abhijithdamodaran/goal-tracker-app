import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AppNav } from "@/components/AppNav";
import { auth } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "GoalTracker — Track Goals, Build Habits, Achieve More",
  description:
    "A goal tracking app with AI coaching for individuals and families.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user
    ? { name: session.user.name, image: session.user.image, homeScreen: session.user.homeScreen }
    : null;

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f6fafe]">
        <SessionProvider>
          <AppNav user={user} />
          <div className="md:ml-64 pb-16 md:pb-0 min-h-screen">
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
