"use client";

/**
 * StreakModeSelector
 *
 * A radio-group component that lets the user choose one of the three habit
 * streak modes:
 *   - Strict                — any miss resets the streak to 0
 *   - One-grace-per-week   — one skip per week is forgiven
 *   - Percentage-threshold — streak survives above a configured weekly %
 *
 * When "Percentage-threshold" is selected a secondary input slides in so the
 * user can set the required completion rate (1 – 100 %).
 *
 * Usage — uncontrolled (pass value/onChange directly):
 *   <StreakModeSelector
 *     value={streakMode}
 *     onChange={setStreakMode}
 *     percentageThreshold={threshold}
 *     onPercentageThresholdChange={setThreshold}
 *   />
 *
 * Usage — React Hook Form (pass register/watch results):
 *   <StreakModeSelector
 *     value={watch("streakMode")}
 *     onChange={(mode) => setValue("streakMode", mode)}
 *     percentageThreshold={watch("percentageThreshold")}
 *     onPercentageThresholdChange={(v) => setValue("percentageThreshold", v)}
 *     error={errors.streakMode?.message}
 *     percentageThresholdError={errors.percentageThreshold?.message}
 *   />
 */

import { useId } from "react";
import { StreakMode } from "@/lib/streaks/types";

// ─── Option Metadata ──────────────────────────────────────────────────────────

interface StreakModeOption {
  value: StreakMode;
  label: string;
  description: string;
  /** Emoji badge shown next to the label for quick visual recognition */
  badge: string;
}

const STREAK_MODE_OPTIONS: StreakModeOption[] = [
  {
    value: StreakMode.Strict,
    label: "Strict",
    description:
      "Any missed scheduled day immediately resets your streak to zero. Best for habits you want to be non-negotiable.",
    badge: "🔒",
  },
  {
    value: StreakMode.OneGracePerWeek,
    label: "One grace per week",
    description:
      "You get one free skip per week without breaking your streak. A second miss in the same week resets the count.",
    badge: "🛡️",
  },
  {
    value: StreakMode.PercentageThreshold,
    label: "Percentage threshold",
    description:
      "Your streak continues as long as you hit a target completion rate each week (e.g. 80 %). Great for flexible habits.",
    badge: "📊",
  },
];

// ─── Default threshold (80 %) ─────────────────────────────────────────────────

const DEFAULT_PERCENTAGE_THRESHOLD = 80;

// ─── Props ────────────────────────────────────────────────────────────────────

export interface StreakModeSelectorProps {
  /** Currently selected streak mode */
  value: StreakMode;
  /** Called with the new StreakMode when the user changes their selection */
  onChange: (mode: StreakMode) => void;

  /**
   * Current percentage threshold value (0–100, integer).
   * Only rendered / used when value === StreakMode.PercentageThreshold.
   * Defaults to 80 if not provided.
   */
  percentageThreshold?: number;
  /**
   * Called with the new threshold (0–100) when the user edits the percentage input.
   */
  onPercentageThresholdChange?: (threshold: number) => void;

  /** Validation error message for streakMode (shown below the radio group) */
  error?: string;
  /** Validation error message for percentageThreshold */
  percentageThresholdError?: string;

  /** Disables all interactive controls */
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function StreakModeSelector({
  value,
  onChange,
  percentageThreshold = DEFAULT_PERCENTAGE_THRESHOLD,
  onPercentageThresholdChange,
  error,
  percentageThresholdError,
  disabled = false,
}: StreakModeSelectorProps) {
  const groupId = useId();

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty string while typing; treat as 0
    const parsed = raw === "" ? 0 : parseInt(raw, 10);
    if (!Number.isNaN(parsed)) {
      onPercentageThresholdChange?.(Math.min(100, Math.max(0, parsed)));
    }
  };

  return (
    <fieldset
      aria-describedby={error ? `${groupId}-error` : undefined}
      disabled={disabled}
      className="space-y-3"
    >
      <legend className="block text-sm font-medium text-gray-700">
        Streak mode
      </legend>

      {/* Radio cards */}
      <div className="space-y-2" role="radiogroup" aria-label="Streak mode">
        {STREAK_MODE_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          const inputId = `${groupId}-${option.value}`;

          return (
            <div key={option.value}>
              <label
                htmlFor={inputId}
                className={[
                  "flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all",
                  "hover:bg-gray-50",
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/60 shadow-sm"
                    : "border-gray-200 bg-white",
                  disabled ? "cursor-not-allowed opacity-60" : "",
                ].join(" ")}
              >
                {/* Hidden radio input */}
                <input
                  type="radio"
                  id={inputId}
                  name={`${groupId}-streak-mode`}
                  value={option.value}
                  checked={isSelected}
                  onChange={() => { if (!disabled) onChange(option.value); }}
                  disabled={disabled}
                  className="sr-only"
                  aria-describedby={`${inputId}-desc`}
                />

                {/* Custom radio indicator */}
                <span
                  aria-hidden="true"
                  className={[
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    isSelected
                      ? "border-indigo-600 bg-indigo-600"
                      : "border-gray-300 bg-white",
                    disabled ? "" : "group-hover:border-indigo-400",
                  ].join(" ")}
                >
                  {isSelected && (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  )}
                </span>

                {/* Label + description */}
                <div className="flex-1 min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="text-base leading-none"
                    >
                      {option.badge}
                    </span>
                    <span
                      className={[
                        "text-sm font-semibold",
                        isSelected ? "text-indigo-700" : "text-gray-800",
                      ].join(" ")}
                    >
                      {option.label}
                    </span>
                  </span>
                  <p
                    id={`${inputId}-desc`}
                    className="mt-0.5 text-xs leading-relaxed text-gray-500"
                  >
                    {option.description}
                  </p>

                  {/* Inline percentage threshold input — only for this option */}
                  {option.value === StreakMode.PercentageThreshold &&
                    isSelected && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <label
                          htmlFor={`${groupId}-threshold`}
                          className="block text-xs font-medium text-gray-700"
                        >
                          Required weekly completion rate
                        </label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="relative w-24">
                            <input
                              id={`${groupId}-threshold`}
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              value={percentageThreshold}
                              onChange={handleThresholdChange}
                              disabled={disabled}
                              aria-describedby={
                                percentageThresholdError
                                  ? `${groupId}-threshold-error`
                                  : undefined
                              }
                              className={[
                                "block w-full rounded-md border px-2.5 py-1.5 pr-7 text-sm",
                                "shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1",
                                percentageThresholdError
                                  ? "border-red-300 focus:border-red-400 focus:ring-red-200"
                                  : "border-gray-300 focus:border-indigo-400 focus:ring-indigo-200",
                                disabled ? "cursor-not-allowed opacity-60" : "",
                              ].join(" ")}
                            />
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-gray-500"
                            >
                              %
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            of scheduled days per week
                          </span>
                        </div>

                        {/* Threshold preset shortcuts */}
                        <div
                          className="mt-2 flex flex-wrap gap-1.5"
                          role="group"
                          aria-label="Quick threshold presets"
                        >
                          {[50, 60, 70, 80, 90, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              disabled={disabled}
                              onClick={() =>
                                onPercentageThresholdChange?.(preset)
                              }
                              className={[
                                "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                                "focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1",
                                percentageThreshold === preset
                                  ? "bg-indigo-600 text-white"
                                  : "bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-700",
                                disabled ? "cursor-not-allowed opacity-60" : "",
                              ].join(" ")}
                              aria-pressed={percentageThreshold === preset}
                            >
                              {preset}%
                            </button>
                          ))}
                        </div>

                        {/* Threshold validation error */}
                        {percentageThresholdError && (
                          <p
                            id={`${groupId}-threshold-error`}
                            role="alert"
                            className="mt-1.5 text-xs text-red-600"
                          >
                            {percentageThresholdError}
                          </p>
                        )}
                      </div>
                    )}
                </div>
              </label>
            </div>
          );
        })}
      </div>

      {/* Streak mode field-level validation error */}
      {error && (
        <p
          id={`${groupId}-error`}
          role="alert"
          className="text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </fieldset>
  );
}
