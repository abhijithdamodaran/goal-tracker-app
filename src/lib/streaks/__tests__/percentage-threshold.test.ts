import { describe, it, expect } from 'vitest';
import { calculatePercentageThresholdStreak } from '../percentage-threshold';
import { StreakMode, DayOfWeek, type CheckIn, type StreakConfig } from '../types';

// 2026-04-13 is Monday, 2026-04-19 is Sunday.
// Use Apr 19 as the Sunday end-of-week reference throughout.

const thresholdConfig: StreakConfig = {
  mode: StreakMode.PercentageThreshold,
  percentageThreshold: 0.8,
};

function makeCheckIn(date: string, completed = true): CheckIn {
  return { date, completed, recordedAt: new Date().toISOString() };
}

describe('calculatePercentageThresholdStreak', () => {
  it('returns zero streak for empty check-ins', () => {
    const result = calculatePercentageThresholdStreak([], thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('throws for wrong mode', () => {
    expect(() =>
      calculatePercentageThresholdStreak(
        [],
        { mode: StreakMode.Strict },
        '2026-04-19'
      )
    ).toThrow('requires StreakMode.PercentageThreshold');
  });

  it('passes week at exactly 80% threshold (6/7 ≈ 85.7%)', () => {
    // Week Apr 13–19. Complete Mon–Sat (6 days), miss Sun Apr 19.
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon
      makeCheckIn('2026-04-14'), // Tue
      makeCheckIn('2026-04-15'), // Wed
      makeCheckIn('2026-04-16'), // Thu
      makeCheckIn('2026-04-17'), // Fri
      makeCheckIn('2026-04-18'), // Sat
      // miss Sun 2026-04-19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('fails week below 80% threshold (5/7 ≈ 71.4%)', () => {
    // 5 of 7 days = 71.4% < 80%
    const checkIns = [
      makeCheckIn('2026-04-13'), // Mon
      makeCheckIn('2026-04-14'), // Tue
      makeCheckIn('2026-04-15'), // Wed
      makeCheckIn('2026-04-16'), // Thu
      makeCheckIn('2026-04-17'), // Fri
      // miss Sat 2026-04-18
      // miss Sun 2026-04-19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('counts consecutive passing weeks', () => {
    // Week 1 (Apr 6–12): 6/7 = 85.7% ≥ 80% → passes (miss Apr 12 Sun)
    // Week 2 (Apr 13–19): 6/7 = 85.7% ≥ 80% → passes (miss Apr 19 Sun)
    const checkIns = [
      // Week 1
      makeCheckIn('2026-04-06'),
      makeCheckIn('2026-04-07'),
      makeCheckIn('2026-04-08'),
      makeCheckIn('2026-04-09'),
      makeCheckIn('2026-04-10'),
      makeCheckIn('2026-04-11'),
      // miss 2026-04-12
      // Week 2
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      // miss 2026-04-19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(2);
    expect(result.longestStreak).toBe(2);
    expect(result.isActive).toBe(true);
  });

  it('breaks streak on a failing week between passing weeks', () => {
    // Week 1 (Mar 30–Apr 5): 7/7 → passes
    // Week 2 (Apr 6–12): 4/7 = 57% → fails
    // Week 3 (Apr 13–19): 7/7 → passes
    const checkIns = [
      // Week 1
      makeCheckIn('2026-03-30'),
      makeCheckIn('2026-03-31'),
      makeCheckIn('2026-04-01'),
      makeCheckIn('2026-04-02'),
      makeCheckIn('2026-04-03'),
      makeCheckIn('2026-04-04'),
      makeCheckIn('2026-04-05'),
      // Week 2 — only 4
      makeCheckIn('2026-04-06'),
      makeCheckIn('2026-04-07'),
      makeCheckIn('2026-04-08'),
      makeCheckIn('2026-04-09'),
      // Week 3
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      makeCheckIn('2026-04-19'),
    ];
    const result = calculatePercentageThresholdStreak(checkIns, thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1); // Only week 3
    expect(result.longestStreak).toBe(1);
  });

  it('uses custom threshold value', () => {
    // Set threshold to 50%
    const config: StreakConfig = {
      mode: StreakMode.PercentageThreshold,
      percentageThreshold: 0.5,
    };
    // 4/7 = 57% ≥ 50% → passes
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      // miss Apr 17, 18, 19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('defaults to 80% threshold when not specified', () => {
    const config: StreakConfig = { mode: StreakMode.PercentageThreshold };
    // 5/7 = 71.4% < 80% default → fails
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      // miss Apr 18, 19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('works with scheduled days subset', () => {
    // Mon/Wed/Fri scheduled, 80% threshold → need ≥ 2.4 → need 3/3
    const config: StreakConfig = {
      mode: StreakMode.PercentageThreshold,
      percentageThreshold: 0.8,
      scheduledDays: [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday],
    };
    // Week Apr 13–19: Mon=Apr13, Wed=Apr15, Fri=Apr17 — complete all 3 → 100% ≥ 80%
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-17'),
    ];
    const result = calculatePercentageThresholdStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('fails with scheduled days when below threshold', () => {
    // Mon–Fri scheduled (5 days), threshold 80% → need ≥ 4
    const config: StreakConfig = {
      mode: StreakMode.PercentageThreshold,
      percentageThreshold: 0.8,
      scheduledDays: [
        DayOfWeek.Monday,
        DayOfWeek.Tuesday,
        DayOfWeek.Wednesday,
        DayOfWeek.Thursday,
        DayOfWeek.Friday,
      ],
    };
    // Complete Mon Apr13, Tue Apr14, Wed Apr15 (3/5 = 60% < 80%) → fails
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
    ];
    const result = calculatePercentageThresholdStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('100% threshold requires all scheduled days completed', () => {
    const config: StreakConfig = {
      mode: StreakMode.PercentageThreshold,
      percentageThreshold: 1.0,
    };
    // 6 of 7 → 85.7% < 100%
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      // miss 2026-04-19
    ];
    const result = calculatePercentageThresholdStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('perfect week always passes regardless of threshold', () => {
    const checkIns = [
      makeCheckIn('2026-04-13'),
      makeCheckIn('2026-04-14'),
      makeCheckIn('2026-04-15'),
      makeCheckIn('2026-04-16'),
      makeCheckIn('2026-04-17'),
      makeCheckIn('2026-04-18'),
      makeCheckIn('2026-04-19'),
    ];
    const result = calculatePercentageThresholdStreak(checkIns, thresholdConfig, '2026-04-19');
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
    expect(result.completionRate).toBe(1);
  });
});
