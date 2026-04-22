import { describe, it, expect } from 'vitest';
import { calculateStrictStreak } from '../strict';
import { StreakMode, DayOfWeek, type CheckIn, type StreakConfig } from '../types';

const strictConfig: StreakConfig = { mode: StreakMode.Strict };

function makeCheckIn(date: string, completed = true): CheckIn {
  return { date, completed, recordedAt: new Date().toISOString() };
}

describe('calculateStrictStreak', () => {
  it('returns zero streak for empty check-ins', () => {
    const result = calculateStrictStreak([], strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalCompleted).toBe(0);
    expect(result.isActive).toBe(false);
    expect(result.currentStreakStartDate).toBeNull();
    expect(result.lastCompletedDate).toBeNull();
  });

  it('counts a single-day streak on the reference date', () => {
    const checkIns = [makeCheckIn('2026-04-20')];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isActive).toBe(true);
    expect(result.currentStreakStartDate).toBe('2026-04-20');
  });

  it('counts consecutive days as a streak', () => {
    const checkIns = [
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      makeCheckIn('2026-04-19'),
      makeCheckIn('2026-04-20'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
    expect(result.isActive).toBe(true);
    expect(result.currentStreakStartDate).toBe('2026-04-17');
  });

  it('resets streak on a missed day', () => {
    const checkIns = [
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      // gap on 2026-04-18
      makeCheckIn('2026-04-19'),
      makeCheckIn('2026-04-20'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.isActive).toBe(true);
    expect(result.currentStreakStartDate).toBe('2026-04-19');
  });

  it('reports longest streak from the past even if current is shorter', () => {
    const checkIns = [
      makeCheckIn('2026-04-10'),
      makeCheckIn('2026-04-11'),
      makeCheckIn('2026-04-12'),
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      // gap on 15
      makeCheckIn('2026-04-19'),
      makeCheckIn('2026-04-20'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(5);
  });

  it('marks streak as inactive when reference date has no check-in', () => {
    const checkIns = [
      makeCheckIn('2026-04-18'),
      makeCheckIn('2026-04-19'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
    expect(result.longestStreak).toBe(2);
  });

  it('ignores incomplete check-ins', () => {
    const checkIns = [
      makeCheckIn('2026-04-18', false),
      makeCheckIn('2026-04-19', true),
      makeCheckIn('2026-04-20', true),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(2);
    expect(result.totalCompleted).toBe(2);
  });

  it('handles unsorted check-ins correctly', () => {
    const checkIns = [
      makeCheckIn('2026-04-20'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-19'),
      makeCheckIn('2026-04-18'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(4);
    expect(result.longestStreak).toBe(4);
  });

  it('calculates completion rate correctly', () => {
    const checkIns = [
      makeCheckIn('2026-04-16'),
      // gap on 17, 18
      makeCheckIn('2026-04-19'),
      makeCheckIn('2026-04-20'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    // 5 total days (16-20 inclusive), 3 completed
    expect(result.totalScheduledDays).toBe(5);
    expect(result.totalCompleted).toBe(3);
    expect(result.completionRate).toBeCloseTo(0.6);
  });

  it('handles duplicate check-ins for the same date', () => {
    const checkIns = [
      makeCheckIn('2026-04-20'),
      makeCheckIn('2026-04-20'),
      makeCheckIn('2026-04-19'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.currentStreak).toBe(2);
    expect(result.totalCompleted).toBe(2); // deduped
  });

  it('throws for non-strict config', () => {
    expect(() =>
      calculateStrictStreak(
        [],
        { mode: StreakMode.OneGracePerWeek },
        '2026-04-20'
      )
    ).toThrow('requires StreakMode.Strict');
  });

  it('reports lastCompletedDate correctly', () => {
    const checkIns = [
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-18'),
    ];
    const result = calculateStrictStreak(checkIns, strictConfig, '2026-04-20');
    expect(result.lastCompletedDate).toBe('2026-04-18');
  });

  it('respects scheduledDays — skips non-scheduled days', () => {
    // Only Mon/Wed/Fri scheduled
    const config: StreakConfig = {
      mode: StreakMode.Strict,
      scheduledDays: [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday],
    };
    // 2026-04-13=Mon, 14=Tue, 15=Wed, 16=Thu, 17=Fri, 18=Sat, 19=Sun, 20=Mon
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon ✓
      makeCheckIn('2026-04-15'), // Wed ✓
      makeCheckIn('2026-04-17'), // Fri ✓
      makeCheckIn('2026-04-20'), // Mon ✓
    ];
    // No check-in on Tue/Thu/Sat/Sun, but those aren't scheduled
    const result = calculateStrictStreak(checkIns, config, '2026-04-20');
    expect(result.currentStreak).toBe(4); // All scheduled days completed
    expect(result.isActive).toBe(true);
  });
});
