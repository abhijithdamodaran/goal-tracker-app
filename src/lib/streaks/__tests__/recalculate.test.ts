/**
 * Tests for recalculateStreakState
 *
 * Verifies that the check-in completion handler's streak invocation:
 *   1. Correctly dispatches to the appropriate streak mode engine.
 *   2. Returns all DB-ready streak fields.
 *   3. Derives `graceUsedWeek` correctly for one-grace-per-week mode.
 */

import { describe, it, expect } from 'vitest';
import { recalculateStreakState } from '../recalculate';
import type { HabitStreakContext } from '../recalculate';
import type { CheckIn } from '../types';
import { DayOfWeek } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeHabit(overrides: Partial<HabitStreakContext> = {}): HabitStreakContext {
  return {
    streakMode: 'strict',
    percentageThreshold: 0.8,
    scheduledDays: [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[],
    timezone: 'UTC',
    ...overrides,
  };
}

function makeCheckIn(date: string, completed: boolean): CheckIn {
  return { date, completed, recordedAt: `${date}T00:00:00.000Z` };
}

// ─── Strict Mode ──────────────────────────────────────────────────────────────

describe('recalculateStreakState — strict mode', () => {
  it('returns streakCount=0 when there are no completed check-ins', () => {
    const result = recalculateStreakState(makeHabit(), [], '2026-04-21');

    expect(result.streakCount).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.currentStreakStartDate).toBeNull();
    expect(result.lastCompletedDate).toBeNull();
    expect(result.graceUsedWeek).toBeNull();
  });

  it('counts a single completed check-in as streak=1', () => {
    const checkIns = [makeCheckIn('2026-04-21', true)];
    const result = recalculateStreakState(makeHabit(), checkIns, '2026-04-21');

    expect(result.streakCount).toBe(1);
    expect(result.lastCompletedDate).toBe('2026-04-21');
  });

  it('resets streak to 0 when a scheduled day is missed', () => {
    // Completed Mon–Tue, missed Wed, reference = Thu
    const checkIns = [
      makeCheckIn('2026-04-20', true), // Mon
      makeCheckIn('2026-04-21', true), // Tue
      // Wed 2026-04-22 missed
    ];
    const result = recalculateStreakState(makeHabit(), checkIns, '2026-04-23'); // Thu

    expect(result.streakCount).toBe(0);
  });

  it('does not set graceUsedWeek in strict mode', () => {
    const checkIns = [makeCheckIn('2026-04-21', true)];
    const result = recalculateStreakState(makeHabit(), checkIns, '2026-04-21');

    expect(result.graceUsedWeek).toBeNull();
  });

  it('tracks longestStreak correctly across a reset', () => {
    // 3 days, then a miss, then 1 day
    const checkIns = [
      makeCheckIn('2026-04-14', true),
      makeCheckIn('2026-04-15', true),
      makeCheckIn('2026-04-16', true),
      // miss 2026-04-17
      makeCheckIn('2026-04-18', true),
    ];
    const result = recalculateStreakState(makeHabit(), checkIns, '2026-04-18');

    expect(result.longestStreak).toBe(3);
    expect(result.streakCount).toBe(1);
  });
});

// ─── One-Grace-Per-Week Mode ──────────────────────────────────────────────────

describe('recalculateStreakState — one-grace-per-week mode', () => {
  const graceHabit = makeHabit({ streakMode: 'one-grace-per-week' });

  it('sets graceUsedWeek when exactly 1 scheduled day is missed in the reference week', () => {
    // Week of 2026-04-20 (Mon) — Mon completed, Tue missed, Wed completed
    const checkIns = [
      makeCheckIn('2026-04-20', true),  // Mon
      // Tue 2026-04-21 not in checkIns = missed
      makeCheckIn('2026-04-22', true),  // Wed
    ];
    // Reference date = Wed (so Tue miss is counted)
    const result = recalculateStreakState(graceHabit, checkIns, '2026-04-22');

    expect(result.graceUsedWeek).toBe('2026-W17'); // week containing 2026-04-22
  });

  it('returns graceUsedWeek=null when no misses in the reference week', () => {
    const checkIns = [
      makeCheckIn('2026-04-20', true),
      makeCheckIn('2026-04-21', true),
      makeCheckIn('2026-04-22', true),
    ];
    const result = recalculateStreakState(graceHabit, checkIns, '2026-04-22');

    expect(result.graceUsedWeek).toBeNull();
  });

  it('returns graceUsedWeek=null when 2 misses exist (streak already reset)', () => {
    // 2 misses → streak reset logic, graceUsedWeek null after reset
    const checkIns = [
      makeCheckIn('2026-04-20', true), // Mon
      // Tue missed
      // Wed missed
    ];
    const result = recalculateStreakState(graceHabit, checkIns, '2026-04-22');

    // 2 misses → deriveGraceUsedWeek returns null (not exactly 1 miss)
    expect(result.graceUsedWeek).toBeNull();
  });
});

// ─── Percentage Threshold Mode ────────────────────────────────────────────────

describe('recalculateStreakState — percentage-threshold mode', () => {
  const pctHabit = makeHabit({
    streakMode: 'percentage-threshold',
    percentageThreshold: 0.8,
    scheduledDays: [1, 2, 3, 4, 5] as DayOfWeek[], // Mon–Fri
  });

  it('does not set graceUsedWeek in percentage-threshold mode', () => {
    const checkIns = [
      makeCheckIn('2026-04-20', true),
      makeCheckIn('2026-04-21', true),
    ];
    const result = recalculateStreakState(pctHabit, checkIns, '2026-04-21');

    expect(result.graceUsedWeek).toBeNull();
  });

  it('returns all required DB fields', () => {
    const checkIns = [makeCheckIn('2026-04-20', true)];
    const result = recalculateStreakState(pctHabit, checkIns, '2026-04-20');

    expect(result).toHaveProperty('streakCount');
    expect(result).toHaveProperty('longestStreak');
    expect(result).toHaveProperty('currentStreakStartDate');
    expect(result).toHaveProperty('lastCompletedDate');
    expect(result).toHaveProperty('graceUsedWeek');
  });
});

// ─── Scheduled day context ────────────────────────────────────────────────────

describe('recalculateStreakState — scheduled day context passed correctly', () => {
  it('only counts weekday-scheduled days (Mon–Fri) in the streak', () => {
    const weekdayHabit = makeHabit({
      scheduledDays: [1, 2, 3, 4, 5] as DayOfWeek[], // Mon–Fri only
    });

    // Mon–Fri completed, Sat not included (not scheduled)
    const checkIns = [
      makeCheckIn('2026-04-20', true), // Mon
      makeCheckIn('2026-04-21', true), // Tue
      makeCheckIn('2026-04-22', true), // Wed
      makeCheckIn('2026-04-23', true), // Thu
      makeCheckIn('2026-04-24', true), // Fri
      // Sat 2026-04-25 is not scheduled — skipped
    ];

    const result = recalculateStreakState(weekdayHabit, checkIns, '2026-04-24');
    expect(result.streakCount).toBe(5);
    expect(result.lastCompletedDate).toBe('2026-04-24');
  });
});
