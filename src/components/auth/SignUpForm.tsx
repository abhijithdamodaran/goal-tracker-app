"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpSchema, type SignUpFormData } from "@/lib/validation/auth";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

export function SignUpForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const passwordValue = watch("password", "");

  const onSubmit = async (data: SignUpFormData) => {
    setSubmitError(null);
    try {
      // TODO: Replace with actual API call to create account
      console.log("Sign up data:", {
        name: data.name,
        email: data.email,
      });
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSubmitSuccess(true);
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  };

  if (submitSuccess) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <svg
          className="mx-auto h-12 w-12 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3 className="mt-3 text-lg font-semibold text-green-800">
          Account created!
        </h3>
        <p className="mt-1 text-sm text-green-700">
          Check your email to verify your account and get started.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {/* Global error */}
      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Full name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          {...register("name")}
          className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${
              errors.name
                ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200"
            }`}
          placeholder="Jane Doe"
        />
        {errors.name && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email address
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${
              errors.email
                ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200"
            }`}
          placeholder="jane@example.com"
        />
        {errors.email && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <div className="relative mt-1">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            {...register("password")}
            className={`block w-full rounded-lg border px-3 py-2.5 pr-10 text-sm shadow-sm transition-colors
              focus:outline-none focus:ring-2 focus:ring-offset-1
              ${
                errors.password
                  ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                  : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200"
              }`}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
        <PasswordStrengthIndicator password={passwordValue} />
        {errors.password && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("confirmPassword")}
          className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-offset-1
            ${
              errors.confirmPassword
                ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200"
            }`}
          placeholder="••••••••"
        />
        {errors.confirmPassword && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm
          transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2
          focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
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
            Creating account…
          </span>
        ) : (
          "Create account"
        )}
      </button>

      {/* Sign in link */}
      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-500"
        >
          Sign in
        </a>
      </p>
    </form>
  );
}
