/**
 * Streak Calculation Engine — Core Types
 *
 * Defines the type system for tracking habit streaks across
 * multiple modes: strict, relaxed, and custom.
 */

/** Streak counting mode determines how missed days affect the streak */
export enum StreakMode {
  /** Streak resets to 0 on any missed day */
  Strict = 'strict',
  /** Allows a configurable number of grace days before resetting */
  Relaxed = 'relaxed',
  /** Custom schedule — only counts specific days of the week */
  Custom = 'custom',
}

/** Days of the week for custom schedules */
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
   * Number of grace days allowed before streak resets (Relaxed mode only).
   * e.g., graceDays=1 means missing one day doesn't break the streak.
   * Defaults to 1 if not specified in Relaxed mode.
   */
  graceDays?: number;

  /**
   * Which days of the week the habit is scheduled (Custom mode only).
   * e.g., [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday]
   */
  scheduledDays?: DayOfWeek[];

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
  /** Current active streak count */
  currentStreak: number;

  /** Longest streak ever achieved */
  longestStreak: number;

  /** The date the current streak started (ISO date string), or null if no active streak */
  currentStreakStartDate: string | null;

  /** The date of the most recent completed check-in (ISO date string), or null */
  lastCompletedDate: string | null;

  /** Total number of completed check-ins */
  totalCompleted: number;

  /** Total number of days in the tracking period */
  totalDays: number;

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
