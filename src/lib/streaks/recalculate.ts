/**
 * Streak Recalculation Helper
 *
 * Provides `recalculateStreakState` — the canonical function called by the
 * habit check-in completion handler whenever a scheduled occurrence is marked
 * complete (or toggled). It:
 *
 *   1. Builds the `StreakConfig` from the habit's stored settings.
 *   2. Invokes `calculateStreak` (the unified streak engine dispatcher).
 *   3. Derives the `graceUsedWeek` value for one-grace-per-week mode.
 *   4. Returns all denormalised streak fields ready to write back to the DB.
 *
 * The caller (API route handler) is responsible for persisting the returned
 * `HabitStreakUpdate` to the database inside a transaction.
 */

import { calculateStreak } from './index';
import type { CheckIn, StreakConfig } from './types';
import { StreakMode } from './types';
import {
  todayStr,
  toISOWeekString,
  isScheduledDay,
  buildCompletedSet,
  getWeekStart,
} from './utils';
import type { DayOfWeek } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Minimal habit fields required to run a streak recalculation.
 *
 * Intentionally narrow so that callers can pass either a full `Habit` object
 * or a raw `HabitRecord` (with `scheduledDays` pre-parsed).
 */
export interface HabitStreakContext {
  /** One of: "strict" | "one-grace-per-week" | "percentage-threshold" */
  streakMode: string;
  /** Completion threshold (0–1) — only relevant for percentage-threshold mode. */
  percentageThreshold: number;
  /** Parsed scheduled days array. */
  scheduledDays: DayOfWeek[];
  /** IANA timezone string, e.g. "America/New_York". */
  timezone: string;
}

/**
 * All denormalised streak columns to write back to the `Habit` row after
 * recalculation. Maps 1:1 to the Prisma `Habit` model fields.
 */
export interface HabitStreakUpdate {
  streakCount: number;
  longestStreak: number;
  currentStreakStartDate: string | null;
  lastCompletedDate: string | null;
  /** Only meaningful for one-grace-per-week mode; null for other modes. */
  graceUsedWeek: string | null;
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Derive `graceUsedWeek` for one-grace-per-week mode by inspecting the
 * check-in history for the current reference week.
 *
 * Logic:
 * - Walk through each scheduled day of the reference week (Mon–Sun).
 * - Count days that are both scheduled and *not* completed (misses).
 * - If exactly 1 miss exists at or before the reference date → grace consumed
 *   in this week → return the week's ISO week string.
 * - Otherwise → null (no grace consumed this week).
 *
 * A second miss triggers a streak reset in the check-in handler before this
 * function is called, so we only need to track the 0-or-1 case here.
 */
function deriveGraceUsedWeek(
  checkIns: CheckIn[],
  scheduledDays: DayOfWeek[],
  referenceDate: string
): string | null {
  const weekStart = getWeekStart(referenceDate);
  const completedSet = buildCompletedSet(checkIns);

  let missCount = 0;

  for (let offset = 0; offset < 7; offset++) {
    // Calculate date for this day of the week
    const date = addDaysToStr(weekStart, offset);
    // Only evaluate days up to and including the reference date
    if (date > referenceDate) break;

    if (isScheduledDay(date, scheduledDays) && !completedSet.has(date)) {
      missCount++;
    }
  }

  // 0 misses → grace available (graceUsedWeek = null)
  // 1 miss → grace consumed (graceUsedWeek = current week)
  // 2+ misses → streak would have been reset; this week no longer needs tracking
  if (missCount === 1) {
    return toISOWeekString(referenceDate);
  }
  return null;
}

/** Lightweight date offset helper (avoids importing addDays to prevent circular deps). */
function addDaysToStr(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recalculate all streak fields for a habit given its current check-in history.
 *
 * This is the function invoked by the habit check-in completion handler
 * whenever a scheduled occurrence is marked complete. It delegates to the
 * unified streak engine (`calculateStreak`) and derives `graceUsedWeek` for
 * one-grace mode, returning a complete set of DB-ready streak fields.
 *
 * @param habit        - Habit configuration (streakMode, scheduledDays, etc.).
 * @param checkIns     - Full check-in history for the habit (completed + missed).
 * @param referenceDate - Date to calculate against (ISO YYYY-MM-DD). Defaults to today.
 * @returns Updated streak state to persist on the Habit record.
 */
export function recalculateStreakState(
  habit: HabitStreakContext,
  checkIns: CheckIn[],
  referenceDate?: string
): HabitStreakUpdate {
  const refDate = referenceDate ?? todayStr();

  // ── 1. Build the StreakConfig from habit settings ──────────────────────────
  const config: StreakConfig = {
    mode: habit.streakMode as StreakMode,
    scheduledDays: habit.scheduledDays,
    percentageThreshold: habit.percentageThreshold,
    timezone: habit.timezone,
  };

  // ── 2. Invoke the unified streak engine ───────────────────────────────────
  const result = calculateStreak(checkIns, config, refDate);

  // ── 3. Derive graceUsedWeek for one-grace mode ────────────────────────────
  let graceUsedWeek: string | null = null;
  if (habit.streakMode === StreakMode.OneGracePerWeek) {
    graceUsedWeek = deriveGraceUsedWeek(
      checkIns,
      habit.scheduledDays,
      refDate
    );
  }

  // ── 4. Return all fields ready for DB write ────────────────────────────────
  return {
    streakCount: result.currentStreak,
    longestStreak: result.longestStreak,
    currentStreakStartDate: result.currentStreakStartDate,
    lastCompletedDate: result.lastCompletedDate,
    graceUsedWeek,
  };
}
