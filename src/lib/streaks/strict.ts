/**
 * Strict Mode Streak Calculator
 *
 * In strict mode, the streak resets to 0 on any missed scheduled day.
 * If scheduledDays is configured, only those days count.
 */

import type { CheckIn, StreakConfig, StreakResult } from './types';
import { StreakMode } from './types';
import {
  addDays,
  buildCompletedSet,
  daysBetween,
  getDayOfWeek,
  isScheduledDay,
  sortDatesAsc,
  todayStr,
} from './utils';

/**
 * Calculate streak results using strict mode rules.
 *
 * Algorithm:
 * 1. Build a set of all completed dates.
 * 2. Walk backwards from the reference date (only counting scheduled days)
 *    to find the current streak.
 * 3. Walk forward through all dates to find the longest streak.
 */
export function calculateStrictStreak(
  checkIns: CheckIn[],
  config: StreakConfig,
  referenceDate?: string
): StreakResult {
  if (config.mode !== StreakMode.Strict) {
    throw new Error(
      `calculateStrictStreak requires StreakMode.Strict, got ${config.mode}`
    );
  }

  const refDate = referenceDate ?? todayStr();
  const completedSet = buildCompletedSet(checkIns);
  const completedDates = sortDatesAsc([...completedSet]);

  // Edge case: no completed check-ins
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

  // --- Current streak: walk backwards from reference date ---
  let currentStreak = 0;
  let currentStreakStartDate: string | null = null;
  let cursor = refDate;

  // Walk backwards, only counting scheduled days
  const earliestDate = firstDate < refDate ? firstDate : refDate;
  while (cursor >= earliestDate) {
    if (isScheduledDay(cursor, scheduledDays)) {
      if (completedSet.has(cursor)) {
        currentStreak++;
        currentStreakStartDate = cursor;
      } else {
        break;
      }
    }
    cursor = addDays(cursor, -1);
  }

  const isActive = currentStreak > 0;

  // --- Longest streak: walk forward through all dates ---
  let longestStreak = 0;
  let runningStreak = 0;

  const endDate = lastCompletedDate > refDate ? lastCompletedDate : refDate;
  cursor = firstDate;

  while (cursor <= endDate) {
    if (isScheduledDay(cursor, scheduledDays)) {
      if (completedSet.has(cursor)) {
        runningStreak++;
        longestStreak = Math.max(longestStreak, runningStreak);
      } else {
        runningStreak = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // Count total scheduled days in tracking period
  let totalScheduledDays = 0;
  cursor = firstDate;
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
