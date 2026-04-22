"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

// ─── OAuth error messages ────────────────────────────────────────────────────
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthSignin: "Could not start the sign-in flow. Please try again.",
  OAuthCallback: "Something went wrong during sign-in. Please try again.",
  OAuthCreateAccount:
    "Could not create your account. Try a different sign-in method.",
  OAuthAccountNotLinked:
    "An account already exists with the same email. Sign in with the method you used before to link accounts.",
  Callback: "An error occurred in the authentication callback.",
  AccessDenied: "You denied access. Please try again.",
  Configuration: "The authentication service is misconfigured.",
  Default: "An unexpected error occurred. Please try again.",
};

// ─── Sub-component with search params (needs Suspense boundary) ──────────────
function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorCode = searchParams.get("error");
  const errorMessage = errorCode
    ? (OAUTH_ERROR_MESSAGES[errorCode] ?? OAUTH_ERROR_MESSAGES.Default)
    : null;

  // Pre-populate email from URL param (set when returning to resend)
  const emailParam = searchParams.get("email") ?? "";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState(emailParam);
  const [emailError, setEmailError] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [passwordError, setPasswordError] = useState<string>("");
  const [registerError, setRegisterError] = useState<string>("");
  const [loadingProvider, setLoadingProvider] = useState<
    "google" | "apple" | "email" | "credentials" | "register" | null
  >(null);

  // Sync email param changes (e.g. when navigating back with a different address)
  useEffect(() => {
    if (emailParam) setEmail(emailParam);
  }, [emailParam]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setPasswordError("");
    setRegisterError("");
    setEmailError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSSOSignIn(provider: "google" | "apple") {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    try {
      await signIn(provider, { callbackUrl: "/" });
    } catch {
      // signIn redirects on success; only exceptions land here
      setLoadingProvider(null);
    }
  }

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    if (loadingProvider) return;
    setPasswordError("");
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setPasswordError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setPasswordError("Please enter your password.");
      return;
    }
    setLoadingProvider("credentials");
    try {
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setPasswordError("Invalid email or password.");
        return;
      }
      // Full reload so the new session cookie is read by the server
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      window.location.href = callbackUrl;
    } catch {
      setPasswordError("Sign-in failed. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (loadingProvider) return;
    setRegisterError("");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setRegisterError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setRegisterError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setRegisterError("Passwords do not match.");
      return;
    }

    setLoadingProvider("register");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegisterError(data.error ?? "Registration failed. Please try again.");
        return;
      }
      // Auto sign-in after successful registration
      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setRegisterError("Account created but sign-in failed. Try signing in manually.");
        return;
      }
      const callbackUrl = searchParams.get("callbackUrl") ?? "/";
      window.location.href = callbackUrl;
    } catch {
      setRegisterError("Something went wrong. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (loadingProvider) return;
    setEmailError("");

    // Basic client-side email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setLoadingProvider("email");
    try {
      const result = await signIn("nodemailer", { email, redirect: false });
      if (result?.error) {
        setEmailError("Could not send magic link. Please try again.");
        return;
      }
      // Redirect to verify-request with email so it can show the resend button
      router.push(`/verify-request?email=${encodeURIComponent(email)}`);
    } catch {
      setEmailError("Could not send magic link. Please try again.");
    } finally {
      setLoadingProvider(null);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo / Brand */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            GoalTracker
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track goals, build habits, achieve more — together.
          </p>
        </div>

        {/* OAuth error banner */}
        {errorMessage && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Mode toggle tabs */}
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 bg-gray-50"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "border-b-2 border-blue-600 text-blue-600 bg-white"
                  : "text-gray-500 hover:text-gray-700 bg-gray-50"
              }`}
            >
              Create account
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* SSO Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleSSOSignIn("google")}
                disabled={loadingProvider !== null}
                aria-label={mode === "signup" ? "Sign up with Google" : "Continue with Google"}
                className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingProvider === "google" ? <LoadingSpinner /> : <GoogleIcon />}
                {mode === "signup" ? "Sign up with Google" : "Continue with Google"}
              </button>

              <button
                type="button"
                onClick={() => handleSSOSignIn("apple")}
                disabled={loadingProvider !== null}
                aria-label={mode === "signup" ? "Sign up with Apple" : "Continue with Apple"}
                className="relative flex w-full items-center justify-center gap-3 rounded-lg border border-gray-900 bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingProvider === "apple" ? <LoadingSpinner className="text-white" /> : <AppleIcon />}
                {mode === "signup" ? "Sign up with Apple" : "Continue with Apple"}
              </button>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or continue with email</span>
              </div>
            </div>

            {mode === "signin" ? (
              /* Password sign-in form */
              <form onSubmit={handleCredentials} className="space-y-3">
                <div>
                  <label htmlFor="cred-email" className="sr-only">Email address</label>
                  <input
                    id="cred-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (passwordError) setPasswordError(""); }}
                    placeholder="you@example.com"
                    disabled={loadingProvider !== null}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (passwordError) setPasswordError(""); }}
                    placeholder="Password"
                    disabled={loadingProvider !== null}
                    aria-invalid={passwordError ? "true" : undefined}
                    aria-describedby={passwordError ? "pw-error" : undefined}
                    className={`block w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 ${
                      passwordError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {passwordError && (
                    <p id="pw-error" role="alert" className="mt-1 text-xs text-red-600">{passwordError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loadingProvider !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingProvider === "credentials" && <LoadingSpinner className="text-white" />}
                  {loadingProvider === "credentials" ? "Signing in…" : "Sign in with password"}
                </button>
              </form>
            ) : (
              /* Registration form */
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label htmlFor="reg-name" className="sr-only">Name (optional)</label>
                  <input
                    id="reg-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name (optional)"
                    disabled={loadingProvider !== null}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-email" className="sr-only">Email address</label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (registerError) setRegisterError(""); }}
                    placeholder="you@example.com"
                    disabled={loadingProvider !== null}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-password" className="sr-only">Password</label>
                  <input
                    id="reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (registerError) setRegisterError(""); }}
                    placeholder="Password (min 8 characters)"
                    disabled={loadingProvider !== null}
                    className="block w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
                <div>
                  <label htmlFor="reg-confirm" className="sr-only">Confirm password</label>
                  <input
                    id="reg-confirm"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (registerError) setRegisterError(""); }}
                    placeholder="Confirm password"
                    disabled={loadingProvider !== null}
                    aria-invalid={registerError ? "true" : undefined}
                    aria-describedby={registerError ? "reg-error" : undefined}
                    className={`block w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 ${
                      registerError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    }`}
                  />
                  {registerError && (
                    <p id="reg-error" role="alert" className="mt-1 text-xs text-red-600">{registerError}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loadingProvider !== null}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingProvider === "register" && <LoadingSpinner className="text-white" />}
                  {loadingProvider === "register" ? "Creating account…" : "Create account"}
                </button>
              </form>
            )}

            {/* Magic link divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">or use a magic link</span>
              </div>
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (emailError) setEmailError(""); }}
                  placeholder="you@example.com"
                  disabled={loadingProvider !== null}
                  aria-invalid={emailError ? "true" : undefined}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`block w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-500 ${
                    emailError
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  }`}
                />
                {emailError && (
                  <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">{emailError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={loadingProvider !== null}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingProvider === "email" && <LoadingSpinner />}
                {loadingProvider === "email" ? "Sending…" : "Send magic link"}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500">
          By signing in you agree to our{" "}
          <a href="/terms" className="underline hover:text-gray-700">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline hover:text-gray-700">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

function LoadingSpinner({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`h-4 w-4 animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}

// ─── Page export with Suspense boundary for useSearchParams ──────────────────
export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
