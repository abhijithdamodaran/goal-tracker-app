/**
 * Missed Occurrence Handler
 *
 * Detects scheduled habit occurrences that have passed without a check-in
 * being recorded, creates explicit "missed" check-in records for those dates,
 * and invokes the streak engine's recalculation function to keep denormalised
 * streak state in sync.
 *
 * This module is called from two places:
 *   1. The scheduled job endpoint  (`/api/cron/process-missed-streaks`)
 *      which runs nightly (or on-demand) to sweep all active habits.
 *   2. The check-in flow           (`POST /api/habits/[habitId]/check-ins`)
 *      which back-fills past misses for a single habit before recording a
 *      new check-in, ensuring streak state is accurate for offline-sync
 *      scenarios where check-ins may arrive out of order.
 *
 * Design notes
 * ────────────
 * - We deliberately store explicit `completed: false` check-in records for
 *   missed scheduled days rather than relying on implicit absence. This makes
 *   the audit trail complete, simplifies streak recalculation (no need to
 *   reconstruct "what days should have happened"), and supports future
 *   features like miss-pattern analytics.
 *
 * - `recalculateStreakState` from `./recalculate` is the single source of
 *   truth for streak computation. This handler never modifies streak fields
 *   directly — it always delegates to that function.
 *
 * - The lookback window defaults to 30 days. Habits created fewer than 30
 *   days ago only look back to their `createdAt` date.
 */

import { prisma } from '@/lib/prisma';
import { recalculateStreakState } from './recalculate';
import type { CheckIn, DayOfWeek } from './types';
import { isScheduledDay, addDays, todayStr } from './utils';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default number of calendar days to look back for missed occurrences. */
const DEFAULT_LOOKBACK_DAYS = 30;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result summary for a single habit processed by the missed occurrence handler. */
export interface HabitMissProcessResult {
  habitId: string;
  missedDatesCreated: string[];
  streakRecalculated: boolean;
  streakCount: number;
}

/** Aggregate result returned by `processMissedOccurrences`. */
export interface MissedOccurrenceResult {
  /** ISO date string used as the upper bound for miss detection. */
  referenceDate: string;
  /** Number of habits scanned. */
  habitsScanned: number;
  /** Number of habits that had at least one missed occurrence backfilled. */
  habitsWithNewMisses: number;
  /** Total new "missed" check-in records created across all habits. */
  totalMissedRecordsCreated: number;
  /** Per-habit detail for habits that had misses backfilled. */
  details: HabitMissProcessResult[];
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Build the list of calendar dates in the lookback window that:
 *   - Are scheduled days for the habit.
 *   - Fall strictly before `referenceDate` (yesterday or earlier; today's
 *     occurrence is still "upcoming" until end-of-day).
 *   - Do not already have a check-in record (neither completed nor missed).
 *
 * @param startDate      - Earliest date to consider (ISO YYYY-MM-DD).
 * @param endDate        - Latest date to consider, exclusive (ISO YYYY-MM-DD).
 * @param scheduledDays  - Parsed scheduled days from the habit.
 * @param existingDates  - Set of dates that already have a check-in record.
 */
function findMissingScheduledDates(
  startDate: string,
  endDate: string,
  scheduledDays: DayOfWeek[],
  existingDates: Set<string>
): string[] {
  const missing: string[] = [];
  let cursor = startDate;

  while (cursor < endDate) {
    if (isScheduledDay(cursor, scheduledDays) && !existingDates.has(cursor)) {
      missing.push(cursor);
    }
    cursor = addDays(cursor, 1);
  }

  return missing;
}

// ─── Single-habit handler ─────────────────────────────────────────────────────

/**
 * Process missed occurrences for **one habit**.
 *
 * Steps:
 *   1. Load all existing check-ins for the habit.
 *   2. Identify scheduled dates in the lookback window with no check-in.
 *   3. Bulk-insert `completed: false` check-in records for those dates.
 *   4. Invoke `recalculateStreakState` (the streak engine) with `referenceDate`.
 *   5. Persist the updated streak fields to the `Habit` row.
 *
 * Returns a result summary. If no misses are found the streak is still
 * recalculated to guarantee the denormalised fields are fresh.
 *
 * @param habitId       - UUID of the habit to process.
 * @param referenceDate - Upper bound for miss detection (exclusive). Defaults to today.
 * @param lookbackDays  - How far back to scan. Defaults to DEFAULT_LOOKBACK_DAYS.
 */
export async function processMissedOccurrencesForHabit(
  habitId: string,
  referenceDate?: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS
): Promise<HabitMissProcessResult> {
  const refDate = referenceDate ?? todayStr();

  // ── Load habit ───────────────────────────────────────────────────────────────
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    select: {
      id: true,
      streakMode: true,
      percentageThreshold: true,
      scheduledDays: true,
      timezone: true,
      createdAt: true,
      isActive: true,
    },
  });

  if (!habit || !habit.isActive) {
    return {
      habitId,
      missedDatesCreated: [],
      streakRecalculated: false,
      streakCount: 0,
    };
  }

  // ── Parse scheduledDays ──────────────────────────────────────────────────────
  let scheduledDays: DayOfWeek[];
  try {
    scheduledDays = JSON.parse(habit.scheduledDays) as DayOfWeek[];
  } catch {
    scheduledDays = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
  }

  // ── Determine lookback window ────────────────────────────────────────────────
  // Never look back further than the habit's creation date.
  const habitCreatedDate = habit.createdAt.toISOString().slice(0, 10);
  const earliestLookback = addDays(refDate, -lookbackDays);
  const windowStart =
    habitCreatedDate > earliestLookback ? habitCreatedDate : earliestLookback;

  // ── Load existing check-ins ──────────────────────────────────────────────────
  const existingCheckIns = await prisma.habitCheckIn.findMany({
    where: { habitId },
    select: { date: true, completed: true, recordedAt: true },
    orderBy: { date: 'asc' },
  });

  const existingDateSet = new Set(existingCheckIns.map((ci) => ci.date));

  // ── Find scheduled dates with no check-in in the lookback window ─────────────
  // `refDate` itself is the upper-bound exclusive: today's occurrence is only
  // "missed" if the caller explicitly passes tomorrow as referenceDate (the
  // nightly cron uses `addDays(today, 0)` = today, so yesterday and earlier
  // are processed). For explicit miss-detection of past days, pass the day
  // *after* the last date you want to include.
  const missingDates = findMissingScheduledDates(
    windowStart,
    refDate, // exclusive upper bound
    scheduledDays,
    existingDateSet
  );

  // ── Bulk-insert missed check-in records ──────────────────────────────────────
  const now = new Date();
  if (missingDates.length > 0) {
    // Duplicate protection: `existingDateSet` already excludes dates that have
    // a check-in, so missingDates contains only genuinely absent dates. The
    // `@@unique([habitId, date])` DB constraint acts as a final safeguard for
    // concurrent runs; errors from that constraint are non-fatal and harmless.
    await prisma.habitCheckIn.createMany({
      data: missingDates.map((date) => ({
        habitId,
        date,
        completed: false,
        note: null,
        syncStatus: 'synced',
        recordedAt: now,
      })),
    });
  }

  // ── Fetch the full (now updated) check-in history for the streak engine ───────
  const allCheckIns = await prisma.habitCheckIn.findMany({
    where: { habitId },
    select: { date: true, completed: true, recordedAt: true },
    orderBy: { date: 'asc' },
  });

  const streakCheckIns: CheckIn[] = allCheckIns.map((ci) => ({
    date: ci.date,
    completed: ci.completed,
    recordedAt: ci.recordedAt.toISOString(),
  }));

  // ── Invoke the streak engine ─────────────────────────────────────────────────
  //
  // This is the canonical invocation of `recalculateStreakState` for the
  // missed occurrence path. The reference date is the day before the cron
  // boundary — we want the streak to reflect the state as of "yesterday"
  // (all scheduled days up to but not including today).
  const streakUpdate = recalculateStreakState(
    {
      streakMode: habit.streakMode,
      percentageThreshold: habit.percentageThreshold,
      scheduledDays,
      timezone: habit.timezone,
    },
    streakCheckIns,
    refDate
  );

  // ── Persist updated streak state ──────────────────────────────────────────────
  await prisma.habit.update({
    where: { id: habitId },
    data: {
      streakCount: streakUpdate.streakCount,
      longestStreak: streakUpdate.longestStreak,
      currentStreakStartDate: streakUpdate.currentStreakStartDate,
      lastCompletedDate: streakUpdate.lastCompletedDate,
      graceUsedWeek: streakUpdate.graceUsedWeek,
    },
  });

  return {
    habitId,
    missedDatesCreated: missingDates,
    streakRecalculated: true,
    streakCount: streakUpdate.streakCount,
  };
}

// ─── Batch handler (all active habits) ────────────────────────────────────────

/**
 * Process missed occurrences for **all active habits** (or a filtered subset).
 *
 * This is the entry point called by the nightly scheduled job. It iterates
 * every active habit, delegates to `processMissedOccurrencesForHabit`, and
 * aggregates results.
 *
 * @param referenceDate  - Upper bound for miss detection (exclusive). Defaults
 *                         to today, meaning "process everything through yesterday".
 * @param lookbackDays   - How many days back to scan per habit.
 * @param userId         - Optional filter: only process habits for this user.
 */
export async function processMissedOccurrences(
  referenceDate?: string,
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
  userId?: string
): Promise<MissedOccurrenceResult> {
  const refDate = referenceDate ?? todayStr();

  // ── Find all active habits (optionally filtered by user) ─────────────────────
  const habits = await prisma.habit.findMany({
    where: {
      isActive: true,
      ...(userId ? { userId } : {}),
    },
    select: { id: true },
  });

  let habitsWithNewMisses = 0;
  let totalMissedRecordsCreated = 0;
  const details: HabitMissProcessResult[] = [];

  // ── Process each habit sequentially ─────────────────────────────────────────
  // Sequential processing keeps DB load predictable; for large deployments
  // this can be parallelised with a concurrency limit.
  for (const { id } of habits) {
    const result = await processMissedOccurrencesForHabit(
      id,
      refDate,
      lookbackDays
    );

    if (result.missedDatesCreated.length > 0) {
      habitsWithNewMisses++;
      totalMissedRecordsCreated += result.missedDatesCreated.length;
      details.push(result);
    }
  }

  return {
    referenceDate: refDate,
    habitsScanned: habits.length,
    habitsWithNewMisses,
    totalMissedRecordsCreated,
    details,
  };
}
