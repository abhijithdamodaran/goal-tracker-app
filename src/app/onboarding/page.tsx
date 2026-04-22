"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// ─── Step definitions ────────────────────────────────────────────────────────

type Step = "welcome" | "name" | "workspace" | "done";

const STEPS: Step[] = ["welcome", "name", "workspace", "done"];

function stepIndex(step: Step): number {
  return STEPS.indexOf(step);
}

// ─── Progress indicator ───────────────────────────────────────────────────────

function ProgressDots({ current }: { current: Step }) {
  // Only show progress for the "journey" steps (not the final done step)
  const journeySteps: Step[] = ["welcome", "name", "workspace"];
  const currentIdx = journeySteps.indexOf(current);
  if (currentIdx === -1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mb-8" aria-label="Onboarding progress">
      {journeySteps.map((step, idx) => (
        <div
          key={step}
          className={`h-2 rounded-full transition-all duration-300 ${
            idx <= currentIdx
              ? "w-6 bg-blue-600"
              : "w-2 bg-gray-300"
          }`}
          aria-current={step === current ? "step" : undefined}
        />
      ))}
    </div>
  );
}

// ─── Step: Welcome ────────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-lg shadow-blue-200">
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      </div>

      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          Welcome to GoalTracker
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed max-w-md mx-auto">
          Your AI-powered coach for setting goals, building habits, and
          achieving more — together with the people you care about.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2">
        {[
          {
            icon: (
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            label: "SMART Goals",
          },
          {
            icon: (
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
              </svg>
            ),
            label: "Daily Habits",
          },
          {
            icon: (
              <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            ),
            label: "Family Sharing",
          },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl bg-blue-50 p-4"
          >
            {icon}
            <span className="text-xs font-medium text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Get started
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Step: Name ───────────────────────────────────────────────────────────────

function NameStep({
  initialName,
  onNext,
  onBack,
}: {
  initialName: string;
  onNext: (name: string) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please enter your name.");
      return;
    }
    if (trimmed.length > 100) {
      setError("Name must be at most 100 characters.");
      return;
    }
    onNext(trimmed);
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          What should we call you?
        </h2>
        <p className="text-gray-600">
          This is how you&apos;ll appear to family members you invite.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="display-name" className="block text-sm font-medium text-gray-700 mb-1.5">
            Your name
          </label>
          <input
            id="display-name"
            type="text"
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError("");
            }}
            placeholder="e.g. Alex"
            aria-invalid={error ? "true" : undefined}
            aria-describedby={error ? "name-error" : undefined}
            className={`block w-full rounded-xl border px-4 py-3 text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {error && (
            <p id="name-error" role="alert" className="mt-1.5 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
          >
            ← Back
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Continue
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Step: Workspace ──────────────────────────────────────────────────────────

type WorkspaceChoice = "personal" | "create-family" | "join-family";

function WorkspaceStep({
  onNext,
  onBack,
}: {
  onNext: (choice: WorkspaceChoice) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<WorkspaceChoice>("personal");

  const options: Array<{
    value: WorkspaceChoice;
    icon: React.ReactNode;
    title: string;
    description: string;
  }> = [
    {
      value: "personal",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      title: "Personal workspace",
      description: "Start tracking your own goals and habits. You can invite family anytime later.",
    },
    {
      value: "create-family",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
        </svg>
      ),
      title: "Create a family workspace",
      description: "Set up a shared space for you and your partner. Share goals and habits together.",
    },
    {
      value: "join-family",
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
      ),
      title: "Join an existing family",
      description: "Your partner has already created a workspace — enter their invite code to join.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          How would you like to start?
        </h2>
        <p className="text-gray-600">
          You can always change this later from your settings.
        </p>
      </div>

      <div className="space-y-3">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setSelected(opt.value)}
            className={`w-full flex items-start gap-4 rounded-xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              selected === opt.value
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
            }`}
            aria-pressed={selected === opt.value}
          >
            <div
              className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                selected === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {opt.icon}
            </div>
            <div>
              <p
                className={`font-semibold ${
                  selected === opt.value ? "text-blue-900" : "text-gray-900"
                }`}
              >
                {opt.title}
              </p>
              <p className="mt-0.5 text-sm text-gray-600">{opt.description}</p>
            </div>
            {/* Selected checkmark */}
            {selected === opt.value && (
              <svg
                className="ml-auto mt-0.5 h-5 w-5 shrink-0 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={() => onNext(selected)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Continue
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Step: Done ───────────────────────────────────────────────────────────────

function DoneStep({ userName }: { userName: string }) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-100 shadow-sm">
        <svg
          className="h-10 w-10 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          {userName ? `You're all set, ${userName}!` : "You're all set!"}
        </h2>
        <p className="text-gray-600 max-w-sm mx-auto">
          Your account is ready. Start by creating your first goal — we&apos;ll
          suggest milestones and action items to help you get there.
        </p>
      </div>

      {/* Loading indicator while redirecting */}
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Taking you to your dashboard…
      </div>
    </div>
  );
}

// ─── Onboarding wizard ────────────────────────────────────────────────────────

/**
 * Multi-step onboarding wizard shown to new users immediately after their
 * first sign-in.
 *
 * Steps:
 *  1. welcome   — intro screen
 *  2. name      — display name input
 *  3. workspace — choose personal / create family / join family
 *  4. done      — success screen (calls API, then redirects)
 *
 * The wizard calls POST /api/user/onboarding when the user completes the
 * final step. The middleware checks `session.user.onboardingCompleted`
 * which is populated from the database; once the flag is set the user can
 * navigate freely and won't be redirected back here.
 */
export default function OnboardingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("welcome");
  const [displayName, setDisplayName] = useState(
    session?.user?.name ?? ""
  );
  const [apiError, setApiError] = useState("");

  // ── Step navigation helpers ──────────────────────────────────────────────

  function goToStep(s: Step) {
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Final step: persist onboarding completion ────────────────────────────

  async function finishOnboarding(workspaceChoice: WorkspaceChoice) {
    setApiError("");
    goToStep("done");

    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName || undefined }),
      });

      if (!res.ok) {
        const data = await res.json();
        setApiError(data.error ?? "Something went wrong. Please try again.");
        goToStep("workspace"); // bounce back if error
        return;
      }

      // Onboarding complete — redirect to dashboard or family setup
      startTransition(() => {
        if (workspaceChoice === "create-family") {
          router.push("/family/create");
        } else if (workspaceChoice === "join-family") {
          router.push("/family/join");
        } else {
          router.push("/dashboard");
        }
      });
    } catch {
      setApiError("Could not save your preferences. Please try again.");
      goToStep("workspace");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <ProgressDots current={step} />

      {apiError && (
        <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{apiError}</p>
        </div>
      )}

      {step === "welcome" && (
        <WelcomeStep onNext={() => goToStep("name")} />
      )}

      {step === "name" && (
        <NameStep
          initialName={displayName}
          onNext={(name) => {
            setDisplayName(name);
            goToStep("workspace");
          }}
          onBack={() => goToStep("welcome")}
        />
      )}

      {step === "workspace" && (
        <WorkspaceStep
          onNext={finishOnboarding}
          onBack={() => goToStep("name")}
        />
      )}

      {step === "done" && (
        <DoneStep userName={displayName} />
      )}
    </div>
  );
}
