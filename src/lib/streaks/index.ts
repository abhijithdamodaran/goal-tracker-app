/**
 * Streak Calculation Engine
 *
 * Public API for streak calculations across all three modes:
 * - Strict: any miss resets the streak
 * - One-Grace-Per-Week: one miss per week tolerated
 * - Percentage-Threshold: weekly completion must meet threshold
 */

export { StreakMode, DayOfWeek } from './types';
export type {
  StreakConfig,
  StreakResult,
  CheckIn,
  StreakCalculationInput,
} from './types';

export { calculateStrictStreak } from './strict';
export {
  calculateOneGracePerWeekStreak,
  processScheduledMiss,
  getWeeklyMissCountFromState,
  applyCheckInToOneGraceStreak,
} from './one-grace-per-week';
export type { OneGraceStreakState, MissOutcome } from './one-grace-per-week';
export { calculatePercentageThresholdStreak } from './percentage-threshold';

export {
  parseDate,
  formatDate,
  todayStr,
  daysBetween,
  addDays,
  getDayOfWeek,
  getWeekStart,
  isScheduledDay,
  toISOWeekString,
} from './utils';

import type { CheckIn, StreakConfig, StreakResult } from './types';
import { StreakMode } from './types';
import { calculateStrictStreak } from './strict';
import { calculateOneGracePerWeekStreak } from './one-grace-per-week';
import { calculatePercentageThresholdStreak } from './percentage-threshold';

/**
 * Unified streak calculator that dispatches to the appropriate mode.
 *
 * @param checkIns - Array of check-in records
 * @param config - Streak configuration with mode selection
 * @param referenceDate - The date to calculate against (defaults to today)
 * @returns StreakResult with current streak, longest streak, and statistics
 */
export function calculateStreak(
  checkIns: CheckIn[],
  config: StreakConfig,
  referenceDate?: string
): StreakResult {
  switch (config.mode) {
    case StreakMode.Strict:
      return calculateStrictStreak(checkIns, config, referenceDate);
    case StreakMode.OneGracePerWeek:
      return calculateOneGracePerWeekStreak(checkIns, config, referenceDate);
    case StreakMode.PercentageThreshold:
      return calculatePercentageThresholdStreak(checkIns, config, referenceDate);
    default:
      throw new Error(`Unknown streak mode: ${(config as StreakConfig).mode}`);
  }
}
