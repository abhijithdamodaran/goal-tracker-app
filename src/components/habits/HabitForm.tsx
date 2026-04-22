"use client";

/**
 * HabitForm
 *
 * A full create/edit form for a Habit, including the StreakModeSelector.
 * Uses React Hook Form + Zod for validation.
 *
 * Props:
 *   - defaultValues  — pre-populate fields when editing an existing habit
 *   - onSubmit       — called with validated CreateHabitInput on submit
 *   - isSubmitting   — shows a loading state on the submit button
 *
 * Example:
 *   <HabitForm
 *     onSubmit={async (data) => { await createHabit(data); }}
 *   />
 */

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { StreakMode, DayOfWeek } from "@/lib/streaks/types";
import { StreakModeSelector } from "./StreakModeSelector";
import type { CreateHabitInput } from "@/lib/types/habit";

// ─── Validation Schema ────────────────────────────────────────────────────────

const DAY_LABELS: Record<DayOfWeek, string> = {
  [DayOfWeek.Sunday]: "Sun",
  [DayOfWeek.Monday]: "Mon",
  [DayOfWeek.Tuesday]: "Tue",
  [DayOfWeek.Wednesday]: "Wed",
  [DayOfWeek.Thursday]: "Thu",
  [DayOfWeek.Friday]: "Fri",
  [DayOfWeek.Saturday]: "Sat",
};

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];

const habitFormSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title is required")
      .max(120, "Title must be 120 characters or fewer"),
    description: z.string().max(500, "Description must be 500 characters or fewer").optional(),
    streakMode: z.nativeEnum(StreakMode),
    percentageThreshold: z
      .number()
      .int("Must be a whole number")
      .min(1, "Minimum is 1 %")
      .max(100, "Maximum is 100 %"),
    scheduledDays: z
      .array(z.nativeEnum(DayOfWeek))
      .min(1, "Select at least one day"),
  })
  .superRefine((data, ctx) => {
    if (
      data.streakMode === StreakMode.PercentageThreshold &&
      (data.percentageThreshold < 1 || data.percentageThreshold > 100)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["percentageThreshold"],
        message: "Enter a threshold between 1 % and 100 %",
      });
    }
  });

type HabitFormValues = z.infer<typeof habitFormSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface HabitFormProps {
  defaultValues?: Partial<HabitFormValues>;
  /** Called with the validated input on form submission */
  onSubmit: (data: CreateHabitInput) => Promise<void> | void;
  /** Pass true while an async submission is in flight */
  isSubmitting?: boolean;
  /** Label for the submit button (defaults to "Save habit") */
  submitLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HabitForm({
  defaultValues,
  onSubmit,
  isSubmitting: externalIsSubmitting,
  submitLabel = "Save habit",
}: HabitFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting: rhfIsSubmitting },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      title: "",
      description: "",
      streakMode: StreakMode.Strict,
      percentageThreshold: 80,
      scheduledDays: ALL_DAYS,
      ...defaultValues,
    },
  });

  const isSubmitting = externalIsSubmitting ?? rhfIsSubmitting;
  const selectedDays = watch("scheduledDays");

  const toggleDay = (day: DayOfWeek) => {
    const current = selectedDays ?? [];
    if (current.includes(day)) {
      // Don't allow deselecting the last day
      if (current.length === 1) return;
      setValue(
        "scheduledDays",
        current.filter((d) => d !== day),
        { shouldValidate: true }
      );
    } else {
      setValue("scheduledDays", [...current, day].sort((a, b) => a - b) as DayOfWeek[], {
        shouldValidate: true,
      });
    }
  };

  const handleFormSubmit = async (values: HabitFormValues) => {
    setSubmitError(null);
    try {
      await onSubmit({
        title: values.title,
        description: values.description || undefined,
        streakMode: values.streakMode,
        percentageThreshold:
          values.streakMode === StreakMode.PercentageThreshold
            ? values.percentageThreshold / 100 // store as 0–1 in the domain
            : undefined,
        scheduledDays: values.scheduledDays,
      });
    } catch {
      setSubmitError("Something went wrong. Please try again.");
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      className="space-y-6"
    >
      {/* Global submit error */}
      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </div>
      )}

      {/* Title */}
      <div>
        <label
          htmlFor="habit-title"
          className="block text-sm font-medium text-gray-700"
        >
          Habit title <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="habit-title"
          type="text"
          autoComplete="off"
          placeholder="e.g. Morning run, Read 20 pages…"
          {...register("title")}
          className={[
            "mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            errors.title
              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
              : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200",
          ].join(" ")}
        />
        {errors.title && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="habit-description"
          className="block text-sm font-medium text-gray-700"
        >
          Description{" "}
          <span className="text-xs font-normal text-gray-400">(optional)</span>
        </label>
        <textarea
          id="habit-description"
          rows={2}
          placeholder="Why does this habit matter to you?"
          {...register("description")}
          className={[
            "mt-1 block w-full resize-none rounded-lg border px-3 py-2.5 text-sm shadow-sm transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-offset-1",
            errors.description
              ? "border-red-300 focus:border-red-400 focus:ring-red-200"
              : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200",
          ].join(" ")}
        />
        {errors.description && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Scheduled days */}
      <div>
        <span className="block text-sm font-medium text-gray-700">
          Scheduled days
        </span>
        <div
          role="group"
          aria-label="Scheduled days"
          className="mt-2 flex flex-wrap gap-2"
        >
          {ALL_DAYS.map((day) => {
            const isActive = selectedDays?.includes(day) ?? false;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                aria-pressed={isActive}
                className={[
                  "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
                  isActive
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200",
                ].join(" ")}
              >
                {DAY_LABELS[day]}
              </button>
            );
          })}
        </div>
        {errors.scheduledDays && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {errors.scheduledDays.message}
          </p>
        )}
      </div>

      {/* ── Streak Mode Selector ─────────────────────────────────────────────── */}
      <Controller
        control={control}
        name="streakMode"
        render={({ field }) => (
          <Controller
            control={control}
            name="percentageThreshold"
            render={({ field: thresholdField }) => (
              <StreakModeSelector
                value={field.value}
                onChange={field.onChange}
                percentageThreshold={thresholdField.value}
                onPercentageThresholdChange={thresholdField.onChange}
                error={errors.streakMode?.message}
                percentageThresholdError={errors.percentageThreshold?.message}
                disabled={isSubmitting}
              />
            )}
          />
        )}
      />

      {/* Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={[
          "w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm",
          "transition-colors hover:bg-indigo-500 focus:outline-none focus:ring-2",
          "focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        ].join(" ")}
      >
        {isSubmitting ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
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
            Saving…
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}
