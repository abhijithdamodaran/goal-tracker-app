import { describe, it, expect } from 'vitest';
import { calculateStreak, StreakMode, type CheckIn, type StreakConfig } from '../index';

function makeCheckIn(date: string, completed = true): CheckIn {
  return { date, completed, recordedAt: new Date().toISOString() };
}

describe('calculateStreak (unified dispatcher)', () => {
  // 2026-04-19 is Sunday (end of week Apr 13–19). Apr 20 is Monday.
  const checkIns = [
    makeCheckIn('2026-04-17'),
    makeCheckIn('2026-04-18'),
    makeCheckIn('2026-04-19'),
  ];

  it('dispatches to strict mode', () => {
    const config: StreakConfig = { mode: StreakMode.Strict };
    const result = calculateStreak(checkIns, config, '2026-04-19');
    expect(result.currentStreak).toBe(3);
    expect(result.isActive).toBe(true);
  });

  it('dispatches to one-grace-per-week mode', () => {
    const config: StreakConfig = { mode: StreakMode.OneGracePerWeek };
    const result = calculateStreak(checkIns, config, '2026-04-19');
    // Week Apr 13–19: completed Apr 17, 18, 19 — missed Apr 13–16 (4 misses > 1) → fails
    expect(result.isActive).toBe(false);
  });

  it('dispatches to percentage-threshold mode', () => {
    const config: StreakConfig = {
      mode: StreakMode.PercentageThreshold,
      percentageThreshold: 0.4,
    };
    const result = calculateStreak(checkIns, config, '2026-04-19');
    // 3/7 = 42.8% ≥ 40% → passes
    expect(result.currentStreak).toBe(1);
    expect(result.isActive).toBe(true);
  });

  it('throws on unknown mode', () => {
    const config = { mode: 'invalid' as StreakMode };
    expect(() => calculateStreak([], config, '2026-04-20')).toThrow('Unknown streak mode');
  });
});
