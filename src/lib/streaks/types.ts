/**
 * Streak Calculation Engine — Core Types
 *
 * Defines the type system for tracking habit streaks across
 * three modes: strict, one-grace-per-week, percentage-threshold.
 */

/** Streak counting mode determines how missed days affect the streak */
export enum StreakMode {
  /** Streak resets to 0 on any missed scheduled occurrence */
  Strict = 'strict',
  /** One skip per week is tolerated; a second miss in the same week resets */
  OneGracePerWeek = 'one-grace-per-week',
  /** Streak survives while weekly completion rate stays at or above threshold */
  PercentageThreshold = 'percentage-threshold',
}

/** Days of the week for scheduling */
export enum DayOfWeek {
  Sunday = 0,
  Monday = 1,
  Tuesday = 2,
  Wednesday = 3,
  Thursday = 4,
  Friday = 5,
  Saturday = 6,
}

/** Configuration for streak calculation */
export interface StreakConfig {
  /** Which mode to use for streak calculation */
  mode: StreakMode;

  /**
   * Which days of the week the habit is scheduled.
   * Defaults to every day (all 7 days) if not specified.
   */
  scheduledDays?: DayOfWeek[];

  /**
   * Required weekly completion percentage (0-1) for PercentageThreshold mode.
   * e.g., 0.8 means 80% of scheduled days must be completed.
   * Defaults to 0.8 if not specified.
   */
  percentageThreshold?: number;

  /**
   * The timezone to use for day boundary calculations.
   * Defaults to 'UTC' if not specified.
   */
  timezone?: string;
}

/** A single check-in record for a habit */
export interface CheckIn {
  /** The date of the check-in (ISO 8601 date string, e.g. '2026-04-20') */
  date: string;

  /** Whether the habit was completed on this date */
  completed: boolean;

  /** Optional note attached to the check-in */
  note?: string;

  /** Timestamp of when this check-in was recorded (for offline sync ordering) */
  recordedAt: string;
}

/** Result of a streak calculation */
export interface StreakResult {
  /** Current active streak count (in weeks for weekly modes, days for strict) */
  currentStreak: number;

  /** Longest streak ever achieved */
  longestStreak: number;

  /** The date the current streak started (ISO date string), or null if no active streak */
  currentStreakStartDate: string | null;

  /** The date of the most recent completed check-in (ISO date string), or null */
  lastCompletedDate: string | null;

  /** Total number of completed check-ins */
  totalCompleted: number;

  /** Total number of scheduled days in the tracking period */
  totalScheduledDays: number;

  /** Completion rate as a decimal (0-1) */
  completionRate: number;

  /** Whether the streak is currently active (not broken) as of the reference date */
  isActive: boolean;
}

/** Input parameters for streak calculation */
export interface StreakCalculationInput {
  /** Array of check-in records, can be in any order */
  checkIns: CheckIn[];

  /** Streak configuration */
  config: StreakConfig;

  /**
   * Reference date to calculate the streak against (ISO date string).
   * Typically "today". Defaults to current date if not specified.
   */
  referenceDate?: string;
}
