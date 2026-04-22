/**
 * Percentage-Threshold Mode Streak Calculator
 *
 * Streak survives while the weekly completion rate stays at or above
 * a configured threshold (e.g., 80%). Each week is evaluated independently.
 * The streak counts consecutive weeks meeting the threshold.
 */

import type { CheckIn, StreakConfig, StreakResult } from './types';
import { StreakMode } from './types';
import {
  addDays,
  buildCompletedSet,
  countWeekCompletions,
  getWeekStart,
  isScheduledDay,
  sortDatesAsc,
  todayStr,
} from './utils';

const DEFAULT_THRESHOLD = 0.8;

/**
 * Calculate streak using percentage-threshold rules.
 *
 * A week is "passing" if (completed / scheduled) >= threshold.
 * Streak counts consecutive passing weeks from the current week backwards.
 */
export function calculatePercentageThresholdStreak(
  checkIns: CheckIn[],
  config: StreakConfig,
  referenceDate?: string
): StreakResult {
  if (config.mode !== StreakMode.PercentageThreshold) {
    throw new Error(
      `calculatePercentageThresholdStreak requires StreakMode.PercentageThreshold, got ${config.mode}`
    );
  }

  const refDate = referenceDate ?? todayStr();
  const completedSet = buildCompletedSet(checkIns);
  const completedDates = sortDatesAsc([...completedSet]);
  const threshold = config.percentageThreshold ?? DEFAULT_THRESHOLD;

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

  // Evaluate each week: does it meet the percentage threshold?
  const weekPasses = weeks.map((weekStart) => {
    const { completed, scheduled } = countWeekCompletions(
      weekStart,
      completedSet,
      scheduledDays,
      weekStart === refWeekStart ? refDate : undefined
    );
    if (scheduled === 0) return true; // No scheduled days → trivially passes
    return completed / scheduled >= threshold;
  });

  // Current streak: count consecutive passing weeks backwards from current week
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
