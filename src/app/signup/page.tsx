import { redirect } from "next/navigation";

/**
 * /signup — redirect to /signin.
 *
 * GoalTracker uses passwordless authentication (Google SSO, Apple SSO,
 * and magic-link email). There is no separate sign-up flow; new users
 * are automatically created on first sign-in.
 */
export default function SignUpPage() {
  redirect("/signin");
}
