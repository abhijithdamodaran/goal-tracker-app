/**
 * Habit Domain Types
 *
 * TypeScript types for the Habit data model, mirroring the Prisma schema
 * with additional branded/narrowed types for streak mode and sync status.
 *
 * These types are used throughout the app for type-safe habit management
 * and integrate with the streak calculation engine in src/lib/streaks/.
 */

import type { StreakMode, DayOfWeek } from '../streaks/types';

// ─── Branded Primitives ───────────────────────────────────────────────────────

/** ISO date string (YYYY-MM-DD), e.g. "2026-04-21" */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/** ISO week string (YYYY-Www), e.g. "2026-W16" */
export type ISOWeekString = string & { readonly __brand: 'ISOWeekString' };

// ─── Sync Status ─────────────────────────────────────────────────────────────

/**
 * Offline-sync lifecycle for a HabitCheckIn record.
 *
 * - `synced`   — persisted on the server and confirmed.
 * - `pending`  — written locally while offline; awaiting background sync.
 * - `conflict` — server and local versions diverged; requires resolution.
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict';

// ─── Core DB-aligned types ────────────────────────────────────────────────────

/**
 * The Habit record as stored in the database.
 *
 * `streakMode` is stored as a plain string in the DB.
 * Cast to `StreakMode` when passing to the streak calculation engine.
 *
 * `scheduledDays` is a JSON-encoded integer array, e.g. "[1,2,3,4,5]".
 * Parse with `JSON.parse(habit.scheduledDays) as DayOfWeek[]` when needed.
 */
export interface HabitRecord {
  id: string;
  title: string;
  description: string | null;

  // ── Streak configuration ─────────────────────────────────────────────────
  /** One of: "strict" | "one-grace-per-week" | "percentage-threshold" */
  streakMode: string;
  /** Completion threshold (0.0–1.0); only used in percentage-threshold mode. */
  percentageThreshold: number;
  /** JSON-encoded DayOfWeek[] — parse before use. */
  scheduledDays: string;
  /** IANA timezone identifier, e.g. "America/New_York". */
  timezone: string;

  // ── Streak state (denormalised) ──────────────────────────────────────────
  /** Current active streak count. */
  streakCount: number;
  /** All-time longest streak achieved. */
  longestStreak: number;
  /**
   * ISO week string ("YYYY-Www") of the week grace was last consumed.
   * Null when grace has not been used in the current week.
   * Used exclusively by one-grace-per-week mode.
   */
  graceUsedWeek: string | null;
  /** ISO date string of when the current streak started. Null if no active streak. */
  currentStreakStartDate: string | null;
  /** ISO date string of the most recent completed check-in. Null if never completed. */
  lastCompletedDate: string | null;

  // ── Status ───────────────────────────────────────────────────────────────
  isActive: boolean;

  // ── Timestamps ───────────────────────────────────────────────────────────
  createdAt: Date;
  updatedAt: Date;

  // ── Ownership ────────────────────────────────────────────────────────────
  userId: string;
}

/**
 * A single check-in record for one day of a Habit.
 *
 * Records are created locally (for offline support) with syncStatus="pending"
 * and updated to "synced" once the background sync confirms server persistence.
 */
export interface HabitCheckInRecord {
  id: string;
  /** ISO date string (YYYY-MM-DD) the check-in covers. */
  date: string;
  completed: boolean;
  note: string | null;
  /** Timestamp of when this check-in was written on the client. */
  recordedAt: Date;
  /** Offline-sync lifecycle state. */
  syncStatus: SyncStatus;
  habitId: string;
}

// ─── Rich/Computed types ─────────────────────────────────────────────────────

/**
 * Habit with its `streakMode` narrowed to the typed `StreakMode` enum
 * and `scheduledDays` pre-parsed into `DayOfWeek[]`.
 *
 * Use this type after loading a habit from the DB and calling `parseHabit()`.
 */
export interface Habit extends Omit<HabitRecord, 'streakMode' | 'scheduledDays'> {
  streakMode: StreakMode;
  scheduledDays: DayOfWeek[];
}

/**
 * Habit with its check-in history included.
 */
export interface HabitWithCheckIns extends Habit {
  checkIns: HabitCheckInRecord[];
}

// ─── Input / Mutation types ───────────────────────────────────────────────────

/** Fields required to create a new Habit. */
export interface CreateHabitInput {
  title: string;
  description?: string;
  streakMode: StreakMode;
  /** Completion threshold for percentage-threshold mode (0.0–1.0). Defaults to 0.8. */
  percentageThreshold?: number;
  /** Days on which the habit should be completed. Defaults to every day. */
  scheduledDays?: DayOfWeek[];
  /** User's IANA timezone. Defaults to "UTC". */
  timezone?: string;
}

/** Fields that may be updated on an existing Habit. */
export interface UpdateHabitInput {
  title?: string;
  description?: string | null;
  streakMode?: StreakMode;
  percentageThreshold?: number;
  scheduledDays?: DayOfWeek[];
  timezone?: string;
  isActive?: boolean;
}

/** Fields required to record a check-in for a Habit. */
export interface CreateHabitCheckInInput {
  habitId: string;
  /** ISO date string (YYYY-MM-DD). */
  date: string;
  completed: boolean;
  note?: string;
  /** Override sync status for offline writes. Defaults to "synced". */
  syncStatus?: SyncStatus;
}

// ─── Helper / Utility types ───────────────────────────────────────────────────

/**
 * Parse a raw `HabitRecord` from the database into the richer `Habit` type.
 *
 * @throws {Error} if `streakMode` is not a valid StreakMode value.
 */
export function parseHabit(raw: HabitRecord): Habit {
  const validModes: string[] = ['strict', 'one-grace-per-week', 'percentage-threshold'];
  if (!validModes.includes(raw.streakMode)) {
    throw new Error(`Invalid streakMode value: "${raw.streakMode}"`);
  }

  let scheduledDays: DayOfWeek[];
  try {
    scheduledDays = JSON.parse(raw.scheduledDays) as DayOfWeek[];
  } catch {
    // Fallback to all days if JSON is malformed
    scheduledDays = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  }

  return {
    ...raw,
    streakMode: raw.streakMode as StreakMode,
    scheduledDays,
  };
}

/**
 * Serialise `scheduledDays` from `DayOfWeek[]` to the JSON string stored in the DB.
 */
export function serialiseScheduledDays(days: DayOfWeek[]): string {
  return JSON.stringify(days);
}
