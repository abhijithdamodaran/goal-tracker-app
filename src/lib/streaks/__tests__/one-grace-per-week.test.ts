import { describe, it, expect } from 'vitest';
import {
  calculateOneGracePerWeekStreak,
  processScheduledMiss,
  getWeeklyMissCountFromState,
  applyCheckInToOneGraceStreak,
  type OneGraceStreakState,
} from '../one-grace-per-week';
import { StreakMode, DayOfWeek, type CheckIn, type StreakConfig } from '../types';

const graceConfig: StreakConfig = { mode: StreakMode.OneGracePerWeek };

function makeCheckIn(date: string, completed = true): CheckIn {
  return { date, completed, recordedAt: new Date().toISOString() };
}

// Week boundaries (Mon-Sun):
// Apr 6 (Mon) - Apr 12 (Sun)
// Apr 13 (Mon) - Apr 19 (Sun)
// Apr 20 (Mon) - Apr 26 (Sun)

describe('calculateOneGracePerWeekStreak', () => {
  it('returns zero streak for empty check-ins', () => {
    const result = calculateOneGracePerWeekStreak([], graceConfig, '2026-04-20');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('throws for wrong mode', () => {
    expect(() =>
      calculateOneGracePerWeekStreak(
        [],
        { mode: StreakMode.Strict },
        '2026-04-20'
      )
    ).toThrow('requires StreakMode.OneGracePerWeek');
  });

  it('preserves streak when one day is missed in a week', () => {
    // Week of Apr 13 (Mon) - Apr 19 (Sun), ref = Apr 19 (end of week)
    // Complete 6 of 7 days — one miss is tolerated
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon
      makeCheckIn('2026-04-14'), // Tue
      makeCheckIn('2026-04-15'), // Wed
      // miss Thu 2026-04-16
      makeCheckIn('2026-04-17'), // Fri
      makeCheckIn('2026-04-18'), // Sat
      makeCheckIn('2026-04-19'), // Sun
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1); // 1 passing week
    expect(result.isActive).toBe(true);
  });

  it('resets streak when two days are missed in the same week', () => {
    // Week of Apr 13 (Mon) - Apr 19 (Sun), ref = Apr 19
    // Only 5 of 7 — two misses breaks it
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon
      makeCheckIn('2026-04-14'), // Tue
      // miss Wed 2026-04-15
      // miss Thu 2026-04-16
      makeCheckIn('2026-04-17'), // Fri
      makeCheckIn('2026-04-18'), // Sat
      makeCheckIn('2026-04-19'), // Sun
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('counts consecutive passing weeks', () => {
    // Week 1 (Apr 6-12): miss one day → passes
    // Week 2 (Apr 13-19): miss one day → passes
    // Ref = Apr 19
    const checkIns = [
      // Week 1
      makeCheckIn('2026-04-06'), // Mon
      makeCheckIn('2026-04-07'), // Tue
      makeCheckIn('2026-04-08'), // Wed
      makeCheckIn('2026-04-09'), // Thu
      makeCheckIn('2026-04-10'), // Fri
      makeCheckIn('2026-04-11'), // Sat
      // miss Sun 2026-04-12
      // Week 2
      makeCheckIn('2026-04-13'), // Mon
      makeCheckIn('2026-04-14'), // Tue
      makeCheckIn('2026-04-15'), // Wed
      makeCheckIn('2026-04-16'), // Thu
      // miss Fri 2026-04-17
      makeCheckIn('2026-04-18'), // Sat
      makeCheckIn('2026-04-19'), // Sun
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.currentStreak).toBe(2); // 2 consecutive passing weeks
    expect(result.longestStreak).toBe(2);
    expect(result.isActive).toBe(true);
  });

  it('longest streak from the past when current is shorter', () => {
    // Week 1 (Mar 30 - Apr 5): all completed → passes
    // Week 2 (Apr 6-12): two misses → fails
    // Week 3 (Apr 13-19): one miss → passes
    // Ref = Apr 19
    const checkIns = [
      // Week 1 (all 7 days)
      makeCheckIn('2026-03-30'),
      makeCheckIn('2026-03-31'),
      makeCheckIn('2026-04-01'),
      makeCheckIn('2026-04-02'),
      makeCheckIn('2026-04-03'),
      makeCheckIn('2026-04-04'),
      makeCheckIn('2026-04-05'),
      // Week 2 — only 5 days (two misses)
      makeCheckIn('2026-04-06'),
      makeCheckIn('2026-04-07'),
      makeCheckIn('2026-04-08'),
      makeCheckIn('2026-04-09'),
      makeCheckIn('2026-04-10'),
      // miss 11, 12
      // Week 3 — 6 days (one miss OK)
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      // miss 19
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1); // Only week 3 passes
    expect(result.isActive).toBe(true);
  });

  it('works with scheduled days subset — one grace preserved', () => {
    // Only Mon/Wed/Fri are scheduled
    const config: StreakConfig = {
      mode: StreakMode.OneGracePerWeek,
      scheduledDays: [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday],
    };
    // Week of Apr 13-19: Mon(13), Wed(15), Fri(17) scheduled
    // Complete Mon and Fri, miss Wed → 1 miss, grace preserved
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon ✓
      // miss Wed 2026-04-15
      makeCheckIn('2026-04-17'), // Fri ✓
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('fails with scheduled days when two scheduled days missed', () => {
    // Only Mon/Wed/Fri are scheduled
    const config: StreakConfig = {
      mode: StreakMode.OneGracePerWeek,
      scheduledDays: [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday],
    };
    // Week of Apr 13-19: Mon(13), Wed(15), Fri(17) scheduled
    // Only complete Mon — miss Wed and Fri → 2 misses, streak broken
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon ✓
      // miss Wed 2026-04-15
      // miss Fri 2026-04-17
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('perfect week counts as passing', () => {
    // All 7 days completed in the week of Apr 13-19
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      makeCheckIn('2026-04-19'),
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('reports completion rate across all scheduled days', () => {
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      // miss 2026-04-19
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-19');
    expect(result.totalCompleted).toBe(6);
    expect(result.totalScheduledDays).toBe(7);
    expect(result.completionRate).toBeCloseTo(6 / 7);
  });

  it('handles mid-week reference date (only evaluates days up to ref)', () => {
    // Week of Apr 20-26, ref = Apr 22 (Wed)
    // Scheduled all days. Mon completed, Tue missed, Wed completed.
    // 1 miss out of 3 evaluated days → OK
    const checkIns = [
      makeCheckIn('2026-04-20'), // Mon ✓
      // miss Tue 2026-04-21
      makeCheckIn('2026-04-22'), // Wed ✓
    ];
    const result = calculateOneGracePerWeekStreak(checkIns, graceConfig, '2026-04-22');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });
});

// ─── processScheduledMiss ────────────────────────────────────────────────────
// Week boundaries (Mon-Sun):
// 2026-W15: Apr 13 (Mon) - Apr 19 (Sun)
// 2026-W16: Apr 20 (Mon) - Apr 26 (Sun)
// 2026-W17: Apr 27 (Mon) - May 3 (Sun)

describe('processScheduledMiss', () => {
  it('consumes grace on first miss when graceUsedWeek is null', () => {
    const result = processScheduledMiss('2026-04-21', null);
    expect(result.action).toBe('grace_consumed');
    expect(result.graceUsedWeek).toBe('2026-W17');
  });

  it('consumes grace on first miss when graceUsedWeek is from a previous week', () => {
    const result = processScheduledMiss('2026-04-21', '2026-W16');
    expect(result.action).toBe('grace_consumed');
    expect(result.graceUsedWeek).toBe('2026-W17');
  });

  it('resets streak on second miss in the same week', () => {
    // First miss set graceUsedWeek = '2026-W17'; now a second miss in same week
    const result = processScheduledMiss('2026-04-23', '2026-W17');
    expect(result.action).toBe('streak_reset');
    expect(result.graceUsedWeek).toBeNull();
  });

  it('resets streak when second miss is on a different day of the same week', () => {
    // Week 2026-W17 spans Apr 20 - Apr 26
    // Grace was consumed on Mon Apr 20; another miss on Wed Apr 22 (same week) → reset
    const result = processScheduledMiss('2026-04-22', '2026-W17');
    expect(result.action).toBe('streak_reset');
    expect(result.graceUsedWeek).toBeNull();
  });

  it('consumes grace for new week even if grace was spent in previous week', () => {
    // Grace used in W17 (Apr 20-26); miss occurs in W18 (Apr 27-May 3) → new week, grace available
    const result = processScheduledMiss('2026-04-27', '2026-W17');
    expect(result.action).toBe('grace_consumed');
    expect(result.graceUsedWeek).toBe('2026-W18');
  });

  it('uses correct week string for Monday boundary', () => {
    // Apr 27 is Monday of W18
    const result = processScheduledMiss('2026-04-27', null);
    expect(result.action).toBe('grace_consumed');
    expect(result.graceUsedWeek).toBe('2026-W18');
  });

  it('uses correct week string for Sunday boundary', () => {
    // May 3 is Sunday of W18
    const result = processScheduledMiss('2026-05-03', null);
    expect(result.action).toBe('grace_consumed');
    expect(result.graceUsedWeek).toBe('2026-W18');
  });
});

// ─── getWeeklyMissCountFromState ─────────────────────────────────────────────

describe('getWeeklyMissCountFromState', () => {
  it('returns 0 when grace has not been used (null)', () => {
    expect(getWeeklyMissCountFromState(null, '2026-04-21')).toBe(0);
  });

  it('returns 1 when grace was used in the current week', () => {
    // Apr 21 is Tuesday of W17 (W17 = Apr 20-Apr 26)
    expect(getWeeklyMissCountFromState('2026-W17', '2026-04-21')).toBe(1);
  });

  it('returns 0 when graceUsedWeek is from a prior week', () => {
    expect(getWeeklyMissCountFromState('2026-W16', '2026-04-21')).toBe(0);
  });

  it('returns 0 when graceUsedWeek is from a future week (edge case)', () => {
    expect(getWeeklyMissCountFromState('2026-W18', '2026-04-21')).toBe(0);
  });
});

// ─── applyCheckInToOneGraceStreak ────────────────────────────────────────────

function makeState(overrides: Partial<OneGraceStreakState> = {}): OneGraceStreakState {
  return {
    streakCount: 1,
    longestStreak: 1,
    graceUsedWeek: null,
    currentStreakStartDate: '2026-04-20', // Monday of W17
    lastCompletedDate: '2026-04-20',
    ...overrides,
  };
}

describe('applyCheckInToOneGraceStreak', () => {
  // ── Completed check-ins ────────────────────────────────────────────────────

  it('completed check-in: updates lastCompletedDate when newer', () => {
    const state = makeState({ lastCompletedDate: '2026-04-20' });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: true });
    expect(next.lastCompletedDate).toBe('2026-04-21');
    expect(next.streakCount).toBe(1); // streak count unchanged within week
  });

  it('completed check-in: does not update lastCompletedDate when older', () => {
    const state = makeState({ lastCompletedDate: '2026-04-22' });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-20', completed: true });
    expect(next.lastCompletedDate).toBe('2026-04-22'); // unchanged
  });

  it('completed check-in after streak reset: starts new streak at 1', () => {
    const state = makeState({ streakCount: 0, currentStreakStartDate: null, lastCompletedDate: null });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: true });
    expect(next.streakCount).toBe(1);
    // getWeekStart of Apr 21 (Tue) = Apr 20 (Mon)
    expect(next.currentStreakStartDate).toBe('2026-04-20');
    expect(next.longestStreak).toBe(1);
  });

  it('completed check-in: does not mutate input state', () => {
    const state = makeState();
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: true });
    expect(next).not.toBe(state); // new object
    expect(state.lastCompletedDate).toBe('2026-04-20'); // unchanged
  });

  // ── Missed check-ins (first miss in week) ─────────────────────────────────

  it('first miss in week: grace consumed, streak intact', () => {
    const state = makeState({ graceUsedWeek: null });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: false });
    expect(next.graceUsedWeek).toBe('2026-W17');
    expect(next.streakCount).toBe(1); // streak survives
    expect(next.currentStreakStartDate).toBe('2026-04-20');
  });

  it('first miss after old grace: grace re-consumed for new week, streak intact', () => {
    const state = makeState({ graceUsedWeek: '2026-W16' });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: false });
    expect(next.graceUsedWeek).toBe('2026-W17');
    expect(next.streakCount).toBe(1);
  });

  // ── Second miss in same week → streak reset ────────────────────────────────

  it('second miss in same week: streak resets to 0', () => {
    const state = makeState({ graceUsedWeek: '2026-W17', streakCount: 3 });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-22', completed: false });
    expect(next.streakCount).toBe(0);
    expect(next.currentStreakStartDate).toBeNull();
    expect(next.graceUsedWeek).toBeNull();
  });

  it('second miss: longestStreak is preserved (not reset)', () => {
    const state = makeState({ graceUsedWeek: '2026-W17', streakCount: 3, longestStreak: 5 });
    const next = applyCheckInToOneGraceStreak(state, { date: '2026-04-22', completed: false });
    expect(next.longestStreak).toBe(5); // longest stays
  });

  // ── Unscheduled days ─────────────────────────────────────────────────────

  it('ignores miss on unscheduled day', () => {
    const state = makeState({ graceUsedWeek: null });
    // Only Mon/Wed/Fri scheduled; Tuesday is not scheduled
    const scheduledDays = [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday];
    const next = applyCheckInToOneGraceStreak(
      state,
      { date: '2026-04-21', completed: false }, // Tuesday
      scheduledDays
    );
    expect(next).toEqual(state); // no change
  });

  it('processes miss on scheduled day only', () => {
    const state = makeState({ graceUsedWeek: null });
    const scheduledDays = [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday];
    const next = applyCheckInToOneGraceStreak(
      state,
      { date: '2026-04-22', completed: false }, // Wednesday — scheduled
      scheduledDays
    );
    expect(next.graceUsedWeek).toBe('2026-W17');
  });

  // ── Sequence: one miss then recovery ────────────────────────────────────────

  it('one miss then completion: grace used, streak stays, no further damage', () => {
    let state = makeState({ graceUsedWeek: null, streakCount: 2 });

    // Day 1: miss (Mon Apr 20)
    state = applyCheckInToOneGraceStreak(state, { date: '2026-04-20', completed: false });
    expect(state.graceUsedWeek).toBe('2026-W17');
    expect(state.streakCount).toBe(2); // streak survived

    // Day 2: complete (Tue Apr 21)
    state = applyCheckInToOneGraceStreak(state, { date: '2026-04-21', completed: true });
    expect(state.graceUsedWeek).toBe('2026-W17'); // still tracking W17 grace
    expect(state.streakCount).toBe(2);
  });

  it('two misses in sequence: streak reset on second', () => {
    let state = makeState({ graceUsedWeek: null, streakCount: 5 });

    // First miss — grace consumed
    state = applyCheckInToOneGraceStreak(state, { date: '2026-04-20', completed: false });
    expect(state.graceUsedWeek).toBe('2026-W17');
    expect(state.streakCount).toBe(5);

    // Second miss in same week — streak broken
    state = applyCheckInToOneGraceStreak(state, { date: '2026-04-22', completed: false });
    expect(state.streakCount).toBe(0);
    expect(state.graceUsedWeek).toBeNull();
  });
});
