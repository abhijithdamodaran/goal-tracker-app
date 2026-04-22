/**
 * One-Grace-Per-Week Mode Streak Calculator
 *
 * In this mode, one missed scheduled day per week is tolerated.
 * A second miss in the same week (Mon–Sun) resets the streak to 0.
 *
 * The streak is counted in consecutive weeks where the rule holds.
 *
 * ## Tracking weekly miss count
 *
 * Each habit using this mode carries a `graceUsedWeek` field (ISO week string,
 * e.g. "2026-W16"). The incremental update functions use it to track how many
 * scheduled misses have occurred in the current calendar week:
 *
 * - `graceUsedWeek === null`       → 0 misses this week (grace available)
 * - `graceUsedWeek === currentWeek` → 1 miss consumed (grace spent)
 * - A second miss in the same week   → streak resets to 0
 */

import type { CheckIn, StreakConfig, StreakResult } from './types';
import { DayOfWeek, StreakMode } from './types';
import {
  addDays,
  buildCompletedSet,
  countWeekCompletions,
  getWeekStart,
  isScheduledDay,
  sortDatesAsc,
  todayStr,
  toISOWeekString,
} from './utils';

// ─── Incremental Update Types ─────────────────────────────────────────────────

/**
 * Denormalised streak state snapshot for one-grace-per-week mode.
 *
 * Mirrors the subset of `Habit` fields that the incremental update functions
 * read and write, without requiring a full check-in history recalculation.
 */
export interface OneGraceStreakState {
  /** Current consecutive passing-week streak count. */
  streakCount: number;
  /** All-time longest streak (in weeks). */
  longestStreak: number;
  /**
   * ISO week string ("YYYY-Www") of the week in which the grace skip was last
   * consumed. `null` means no grace has been used in the current (or any recent)
   * week — i.e. the next miss will use grace rather than break the streak.
   */
  graceUsedWeek: string | null;
  /** ISO date string (YYYY-MM-DD) when the current streak started, or null. */
  currentStreakStartDate: string | null;
  /** ISO date string of the most recent completed check-in, or null. */
  lastCompletedDate: string | null;
}

/**
 * Result of processing a single scheduled miss against the current streak state.
 *
 * - `grace_consumed` — first miss of the week; grace tolerated; streak intact.
 * - `streak_reset`   — second miss in same week; streak broken and reset to 0.
 */
export type MissOutcome =
  | { action: 'grace_consumed'; graceUsedWeek: string }
  | { action: 'streak_reset'; graceUsedWeek: null };

// ─── Incremental Update Functions ────────────────────────────────────────────

/**
 * Determine what happens when a scheduled day is missed.
 *
 * Consults `graceUsedWeek` to decide whether this is the first miss (grace
 * tolerated) or the second miss (streak broken) in the same calendar week.
 *
 * This is a **pure function** — it does not mutate any state. Apply the
 * returned outcome to the habit record in your data layer.
 *
 * @param missDate     - The date that was missed (ISO date string, YYYY-MM-DD).
 * @param graceUsedWeek - The habit's current `graceUsedWeek` value.
 * @returns A `MissOutcome` describing the effect on the streak.
 *
 * @example
 * // First miss in week 2026-W17 — grace consumed
 * processScheduledMiss('2026-04-22', null)
 * // → { action: 'grace_consumed', graceUsedWeek: '2026-W17' }
 *
 * // Second miss in the same week — streak broken
 * processScheduledMiss('2026-04-23', '2026-W17')
 * // → { action: 'streak_reset', graceUsedWeek: null }
 */
export function processScheduledMiss(
  missDate: string,
  graceUsedWeek: string | null
): MissOutcome {
  const missWeek = toISOWeekString(missDate);

  if (graceUsedWeek === missWeek) {
    // Grace was already consumed in this calendar week → second miss → reset
    return { action: 'streak_reset', graceUsedWeek: null };
  }

  // First miss this week → consume grace, streak survives
  return { action: 'grace_consumed', graceUsedWeek: missWeek };
}

/**
 * Return the current week's miss count (0, 1, or 2+) for a habit, given its
 * `graceUsedWeek` field and a reference date (defaults to today).
 *
 * This is used for display ("0 of 1 grace used this week") and for determining
 * streak risk before a check-in is submitted.
 *
 * Note: this only reads from the denormalized `graceUsedWeek` field, so it
 * reflects the state as of the last server sync. For a precise count derived
 * from full check-in history, use `countWeekCompletions` from utils.
 *
 * @returns 0 if no grace consumed this week, 1 if grace is consumed, 2 if
 *          the streak was already broken this week (graceUsedWeek was cleared
 *          after a reset — callers should check `streakCount === 0` in that case).
 */
export function getWeeklyMissCountFromState(
  graceUsedWeek: string | null,
  referenceDate?: string
): 0 | 1 {
  const refDate = referenceDate ?? todayStr();
  const currentWeek = toISOWeekString(refDate);
  return graceUsedWeek === currentWeek ? 1 : 0;
}

/**
 * Apply a single check-in event to the one-grace-per-week streak state,
 * returning the updated state.
 *
 * This is the primary incremental update function. It is used to update the
 * denormalised streak fields on a `Habit` record when a check-in is recorded
 * (both online and offline, before background sync).
 *
 * **Rules:**
 * - Unscheduled days are ignored (state returned unchanged).
 * - A **completed** check-in extends the last-completed date; if the streak
 *   was broken (count = 0) it starts a fresh 1-week streak from this week.
 * - A **missed** (not completed) check-in on a scheduled day consumes grace
 *   for the calendar week, or resets the streak if grace is already spent.
 * - Week boundaries are Monday–Sunday.
 *
 * @param state        - Current denormalised streak state (read from DB).
 * @param checkIn      - The check-in being applied (date + completed flag).
 * @param scheduledDays - Days the habit is scheduled; absent = every day.
 * @returns Updated `OneGraceStreakState` (new object, does not mutate input).
 */
export function applyCheckInToOneGraceStreak(
  state: OneGraceStreakState,
  checkIn: { date: string; completed: boolean },
  scheduledDays?: DayOfWeek[]
): OneGraceStreakState {
  const { date, completed } = checkIn;

  // Non-scheduled days have no effect on the streak
  if (!isScheduledDay(date, scheduledDays)) {
    return state;
  }

  const next: OneGraceStreakState = { ...state };

  if (completed) {
    // ── Successful check-in ──────────────────────────────────────────────────
    // Update last completed date if this is more recent
    if (!next.lastCompletedDate || date > next.lastCompletedDate) {
      next.lastCompletedDate = date;
    }

    // If streak was broken, start a new 1-week streak from this week
    if (next.streakCount === 0) {
      next.streakCount = 1;
      next.currentStreakStartDate = getWeekStart(date);
      next.longestStreak = Math.max(next.longestStreak, 1);
    }
    // If already active, the week still passes — count stays the same until
    // week rolls over and the streak calculation is rerun from history.
  } else {
    // ── Missed scheduled day ─────────────────────────────────────────────────
    const outcome = processScheduledMiss(date, next.graceUsedWeek);

    if (outcome.action === 'streak_reset') {
      // Second miss this week — streak broken
      next.streakCount = 0;
      next.currentStreakStartDate = null;
      next.graceUsedWeek = null;
    } else {
      // First miss this week — grace consumed, streak stays
      next.graceUsedWeek = outcome.graceUsedWeek;
    }
  }

  return next;
}

/**
 * Calculate streak using one-grace-per-week rules.
 *
 * A week is "passing" if the number of missed scheduled days is ≤ 1.
 * Streak counts consecutive passing weeks from the current week backwards.
 */
export function calculateOneGracePerWeekStreak(
  checkIns: CheckIn[],
  config: StreakConfig,
  referenceDate?: string
): StreakResult {
  if (config.mode !== StreakMode.OneGracePerWeek) {
    throw new Error(
      `calculateOneGracePerWeekStreak requires StreakMode.OneGracePerWeek, got ${config.mode}`
    );
  }

  const refDate = referenceDate ?? todayStr();
  const completedSet = buildCompletedSet(checkIns);
  const completedDates = sortDatesAsc([...completedSet]);

  if (completedDates.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStartDate: null,
      lastCompletedDate: null,
      totalCompleted: 0,
      totalScheduledDays: 0,
      completionRate: 0,
      isActive: false,
    };
  }

  const firstDate = completedDates[0];
  const lastCompletedDate = completedDates[completedDates.length - 1];
  const scheduledDays = config.scheduledDays;

  // Determine week boundaries
  const firstWeekStart = getWeekStart(firstDate);
  const refWeekStart = getWeekStart(refDate);

  // Build list of all weeks from first to reference
  const weeks: string[] = [];
  let ws = firstWeekStart;
  while (ws <= refWeekStart) {
    weeks.push(ws);
    ws = addDays(ws, 7);
  }

  // Evaluate each week: does it pass the one-grace rule?
  const weekPasses = weeks.map((weekStart) => {
    const { missed } = countWeekCompletions(
      weekStart,
      completedSet,
      scheduledDays,
      weekStart === refWeekStart ? refDate : undefined
    );
    return missed <= 1;
  });

  // Current streak: count consecutive passing weeks backwards from the current week
  let currentStreak = 0;
  let currentStreakStartDate: string | null = null;

  for (let i = weekPasses.length - 1; i >= 0; i--) {
    if (weekPasses[i]) {
      currentStreak++;
      currentStreakStartDate = weeks[i];
    } else {
      break;
    }
  }

  const isActive = currentStreak > 0;

  // Longest streak: find longest consecutive run of passing weeks
  let longestStreak = 0;
  let runningStreak = 0;

  for (const passes of weekPasses) {
    if (passes) {
      runningStreak++;
      longestStreak = Math.max(longestStreak, runningStreak);
    } else {
      runningStreak = 0;
    }
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Count total scheduled days
  let totalScheduledDays = 0;
  let cursor = firstDate;
  while (cursor <= refDate) {
    if (isScheduledDay(cursor, scheduledDays)) {
      totalScheduledDays++;
    }
    cursor = addDays(cursor, 1);
  }

  return {
    currentStreak,
    longestStreak,
    currentStreakStartDate,
    lastCompletedDate,
    totalCompleted: completedDates.length,
    totalScheduledDays,
    completionRate: totalScheduledDays > 0 ? completedDates.length / totalScheduledDays : 0,
    isActive,
  };
}
