/**
 * Tests for processMissedOccurrencesForHabit / processMissedOccurrences
 *
 * Verifies that the missed occurrence handler:
 *   1. Correctly identifies scheduled days with no existing check-in.
 *   2. Creates explicit `completed: false` check-in records for those dates.
 *   3. Invokes the streak engine's recalculation function (`recalculateStreakState`)
 *      for habits where a missed occurrence is detected.
 *   4. Persists the updated streak state to the Habit row.
 *   5. Skips inactive habits.
 *   6. Respects the lookback window and habit creation date boundaries.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock Prisma before importing the module under test.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    habit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    habitCheckIn: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

// Mock recalculateStreakState so we can assert it was called and control its
// return value without running the full streak engine.
vi.mock('@/lib/streaks/recalculate', () => ({
  recalculateStreakState: vi.fn(),
}));

import { prisma } from '@/lib/prisma';
import { recalculateStreakState } from '@/lib/streaks/recalculate';
import {
  processMissedOccurrencesForHabit,
  processMissedOccurrences,
} from '../process-missed';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  habit: {
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  habitCheckIn: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
};

const mockRecalculate = recalculateStreakState as ReturnType<typeof vi.fn>;

/** Build a minimal Habit row as returned by prisma.habit.findUnique. */
function makeHabitRow(overrides: Partial<{
  id: string;
  streakMode: string;
  percentageThreshold: number;
  scheduledDays: string;
  timezone: string;
  createdAt: Date;
  isActive: boolean;
}> = {}) {
  return {
    id: 'habit-1',
    streakMode: 'strict',
    percentageThreshold: 0.8,
    scheduledDays: '[0,1,2,3,4,5,6]', // every day
    timezone: 'UTC',
    createdAt: new Date('2026-04-20T00:00:00.000Z'), // Mon Apr 20
    isActive: true,
    ...overrides,
  };
}

/** Build a minimal HabitCheckIn row. */
function makeCheckInRow(date: string, completed: boolean) {
  return { date, completed, recordedAt: new Date(`${date}T12:00:00.000Z`) };
}

/** Default streak update returned by the mocked streak engine. */
const DEFAULT_STREAK_UPDATE = {
  streakCount: 5,
  longestStreak: 10,
  currentStreakStartDate: '2026-04-15',
  lastCompletedDate: '2026-04-19',
  graceUsedWeek: null,
};

// ─── processMissedOccurrencesForHabit ─────────────────────────────────────────

describe('processMissedOccurrencesForHabit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecalculate.mockReturnValue(DEFAULT_STREAK_UPDATE);
    mockPrisma.habit.update.mockResolvedValue({});
    mockPrisma.habitCheckIn.createMany.mockResolvedValue({ count: 0 });
  });

  // ── Happy path: missed days detected ────────────────────────────────────────

  it('creates missed check-in records for scheduled days with no existing check-in', async () => {
    // Habit created Mon 2026-04-20; scheduled every day.
    // Window: Apr 20 → Apr 22 (refDate, exclusive). So Apr 20 and Apr 21 are in scope.
    // Mon Apr 20: has a check-in. Tue Apr 21: no check-in → should be detected as missed.
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-20T00:00:00.000Z') })
    );
    mockPrisma.habitCheckIn.findMany
      // First call: detect misses — Mon completed, Tue absent
      .mockResolvedValueOnce([makeCheckInRow('2026-04-20', true)])
      // Second call: full history after createMany
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-20', true),
        makeCheckInRow('2026-04-21', false), // newly created miss
      ]);

    // Reference date = Wed 2026-04-22 (exclusive upper bound)
    // lookback = 30 days, but habit created Apr 20 → window starts Apr 20
    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-22', 30);

    // Should have detected Tue 2026-04-21 as the only missing date
    expect(result.missedDatesCreated).toContain('2026-04-21');
    expect(result.missedDatesCreated).toHaveLength(1);

    // createMany should have been called with the missed date
    expect(mockPrisma.habitCheckIn.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ date: '2026-04-21', completed: false }),
        ]),
      })
    );
  });

  it('invokes recalculateStreakState after back-filling missed records', async () => {
    // Habit created Apr 20; reference date = Apr 23 → window: Apr 20–22
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-20T00:00:00.000Z') })
    );
    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce([makeCheckInRow('2026-04-20', true)])
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-20', true),
        makeCheckInRow('2026-04-21', false),
        makeCheckInRow('2026-04-22', false),
      ]);

    await processMissedOccurrencesForHabit('habit-1', '2026-04-23', 30);

    // The streak engine MUST be invoked exactly once
    expect(mockRecalculate).toHaveBeenCalledTimes(1);

    // Called with the correct habit context and reference date
    expect(mockRecalculate).toHaveBeenCalledWith(
      expect.objectContaining({
        streakMode: 'strict',
        percentageThreshold: 0.8,
        timezone: 'UTC',
      }),
      expect.arrayContaining([
        expect.objectContaining({ date: '2026-04-20', completed: true }),
      ]),
      '2026-04-23' // referenceDate passed through
    );
  });

  it('persists the streak update returned by recalculateStreakState', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-21T00:00:00.000Z') })
    );
    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeCheckInRow('2026-04-21', false)]);

    const customUpdate = {
      streakCount: 0,
      longestStreak: 3,
      currentStreakStartDate: null,
      lastCompletedDate: '2026-04-20',
      graceUsedWeek: null,
    };
    mockRecalculate.mockReturnValue(customUpdate);

    await processMissedOccurrencesForHabit('habit-1', '2026-04-23', 30);

    expect(mockPrisma.habit.update).toHaveBeenCalledWith({
      where: { id: 'habit-1' },
      data: {
        streakCount: 0,
        longestStreak: 3,
        currentStreakStartDate: null,
        lastCompletedDate: '2026-04-20',
        graceUsedWeek: null,
      },
    });
  });

  it('returns the correct result summary including streakCount', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-20T00:00:00.000Z') })
    );
    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce([makeCheckInRow('2026-04-20', true)])
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-20', true),
        makeCheckInRow('2026-04-21', false),
      ]);

    mockRecalculate.mockReturnValue({ ...DEFAULT_STREAK_UPDATE, streakCount: 1 });

    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-22', 30);

    expect(result.habitId).toBe('habit-1');
    expect(result.streakRecalculated).toBe(true);
    expect(result.streakCount).toBe(1);
  });

  // ── No misses scenario ───────────────────────────────────────────────────────

  it('still invokes recalculateStreakState when no missed dates are found', async () => {
    // All days completed in the narrow window
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-20T00:00:00.000Z') })
    );
    const checkInHistory = [
      makeCheckInRow('2026-04-20', true),
      makeCheckInRow('2026-04-21', true),
      makeCheckInRow('2026-04-22', true),
    ];
    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce(checkInHistory)
      .mockResolvedValueOnce(checkInHistory);

    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-23', 30);

    // No missed records created
    expect(result.missedDatesCreated).toHaveLength(0);
    // createMany is not called when there are no missing dates (avoids empty DB write)
    expect(mockPrisma.habitCheckIn.createMany).not.toHaveBeenCalled();

    // Streak engine still called to refresh denormalized state
    expect(mockRecalculate).toHaveBeenCalledTimes(1);
    expect(result.streakRecalculated).toBe(true);
  });

  // ── Inactive habit ───────────────────────────────────────────────────────────

  it('skips inactive habits and returns zero counts', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ isActive: false })
    );

    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-23');

    expect(result.missedDatesCreated).toHaveLength(0);
    expect(result.streakRecalculated).toBe(false);
    expect(mockRecalculate).not.toHaveBeenCalled();
    expect(mockPrisma.habitCheckIn.createMany).not.toHaveBeenCalled();
  });

  it('skips non-existent habits', async () => {
    mockPrisma.habit.findUnique.mockResolvedValue(null);

    const result = await processMissedOccurrencesForHabit('no-such-habit', '2026-04-23');

    expect(result.streakRecalculated).toBe(false);
    expect(mockRecalculate).not.toHaveBeenCalled();
  });

  // ── Scheduled days filter ────────────────────────────────────────────────────

  it('only considers scheduled days (Mon–Fri) when detecting misses', async () => {
    // Habit scheduled Mon–Fri only (days 1–5)
    // Created Mon 2026-04-20; window: Apr 20 → Apr 25 (Sat, exclusive)
    // Scheduled days in window: Mon Apr 20, Tue Apr 21, Wed Apr 22, Thu Apr 23, Fri Apr 24
    // Existing check-in: Mon Apr 20 completed
    // Expected misses: Tue Apr 21, Wed Apr 22, Thu Apr 23, Fri Apr 24
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({
        scheduledDays: '[1,2,3,4,5]', // Mon–Fri
        createdAt: new Date('2026-04-20T00:00:00.000Z'),
      })
    );

    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce([makeCheckInRow('2026-04-20', true)])
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-20', true),
        makeCheckInRow('2026-04-21', false),
        makeCheckInRow('2026-04-22', false),
        makeCheckInRow('2026-04-23', false),
        makeCheckInRow('2026-04-24', false),
      ]);

    // Reference date = Sat 2026-04-25 (exclusive)
    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-25', 30);

    // Tue–Fri should be detected as missed
    expect(result.missedDatesCreated).toContain('2026-04-21');
    expect(result.missedDatesCreated).toContain('2026-04-22');
    expect(result.missedDatesCreated).toContain('2026-04-23');
    expect(result.missedDatesCreated).toContain('2026-04-24');

    // Weekend days are not scheduled — should NOT appear
    expect(result.missedDatesCreated).not.toContain('2026-04-18'); // Sat before creation
    expect(result.missedDatesCreated).not.toContain('2026-04-19'); // Sun before creation
    expect(result.missedDatesCreated).not.toContain('2026-04-25'); // Sat (= refDate)
  });

  // ── Lookback boundary ────────────────────────────────────────────────────────

  it('does not look back further than the habit creation date', async () => {
    // Habit created 2026-04-21 (Tue); reference date 2026-04-23 (Thu)
    // window = max(2026-04-21, addDays('2026-04-23', -30)) → 2026-04-21
    // Scan: Apr 21, Apr 22 (both scheduled, no check-ins)
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({
        scheduledDays: '[0,1,2,3,4,5,6]',
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
      })
    );

    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce([]) // no existing check-ins
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-21', false),
        makeCheckInRow('2026-04-22', false),
      ]);

    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-23', 30);

    // Only Apr 21 and Apr 22 should be detected
    expect(result.missedDatesCreated).toHaveLength(2);
    expect(result.missedDatesCreated).toContain('2026-04-21');
    expect(result.missedDatesCreated).toContain('2026-04-22');
    // Apr 20 (day before creation) must NOT be included
    expect(result.missedDatesCreated).not.toContain('2026-04-20');
  });

  // ── Existing missed check-ins ────────────────────────────────────────────────

  it('does not duplicate missed records when they already exist', async () => {
    // Habit created Apr 20. Tue Apr 21 already has completed=false record.
    // The function should NOT create another one for Apr 21.
    mockPrisma.habit.findUnique.mockResolvedValue(
      makeHabitRow({ createdAt: new Date('2026-04-20T00:00:00.000Z') })
    );
    const history = [
      makeCheckInRow('2026-04-20', true),
      makeCheckInRow('2026-04-21', false), // already recorded as missed
    ];
    mockPrisma.habitCheckIn.findMany
      .mockResolvedValueOnce(history)
      .mockResolvedValueOnce(history);

    // Window: Apr 20–21 (refDate = Apr 22, exclusive)
    const result = await processMissedOccurrencesForHabit('habit-1', '2026-04-22', 30);

    // Apr 21 is already in existingDateSet → not added to missingDates
    expect(result.missedDatesCreated).toHaveLength(0);
    // createMany not called because there are no new missed dates to insert
    expect(mockPrisma.habitCheckIn.createMany).not.toHaveBeenCalled();
  });
});

// ─── processMissedOccurrences (batch) ─────────────────────────────────────────

describe('processMissedOccurrences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecalculate.mockReturnValue(DEFAULT_STREAK_UPDATE);
    mockPrisma.habit.update.mockResolvedValue({});
    mockPrisma.habitCheckIn.createMany.mockResolvedValue({ count: 0 });
  });

  it('scans all active habits and aggregates results', async () => {
    // Two habits returned by the batch query
    mockPrisma.habit.findMany.mockResolvedValue([
      { id: 'habit-1' },
      { id: 'habit-2' },
    ]);

    // habit-1 created Apr 20; reference Apr 22 → window: Apr 20, Apr 21
    //   - Mon Apr 20: check-in present. Tue Apr 21: absent → 1 miss
    // habit-2 created Apr 21; reference Apr 22 → window: Apr 21 only
    //   - Apr 21: check-in present → 0 misses
    mockPrisma.habit.findUnique
      .mockResolvedValueOnce(
        makeHabitRow({ id: 'habit-1', createdAt: new Date('2026-04-20T00:00:00.000Z') })
      )
      .mockResolvedValueOnce(
        makeHabitRow({ id: 'habit-2', createdAt: new Date('2026-04-21T00:00:00.000Z') })
      );

    mockPrisma.habitCheckIn.findMany
      // habit-1 first call (detect misses)
      .mockResolvedValueOnce([makeCheckInRow('2026-04-20', true)])
      // habit-1 second call (full history after createMany)
      .mockResolvedValueOnce([
        makeCheckInRow('2026-04-20', true),
        makeCheckInRow('2026-04-21', false),
      ])
      // habit-2 first call (detect misses)
      .mockResolvedValueOnce([makeCheckInRow('2026-04-21', true)])
      // habit-2 second call (full history)
      .mockResolvedValueOnce([makeCheckInRow('2026-04-21', true)]);

    const result = await processMissedOccurrences('2026-04-22', 30);

    expect(result.habitsScanned).toBe(2);
    expect(result.habitsWithNewMisses).toBe(1); // only habit-1 had a miss
    expect(result.totalMissedRecordsCreated).toBe(1);
    expect(result.details).toHaveLength(1);
    expect(result.details[0].habitId).toBe('habit-1');
    expect(result.referenceDate).toBe('2026-04-22');
  });

  it('returns zero counts when no habits exist', async () => {
    mockPrisma.habit.findMany.mockResolvedValue([]);

    const result = await processMissedOccurrences('2026-04-22');

    expect(result.habitsScanned).toBe(0);
    expect(result.habitsWithNewMisses).toBe(0);
    expect(result.totalMissedRecordsCreated).toBe(0);
    expect(result.details).toHaveLength(0);
  });

  it('filters by userId when provided', async () => {
    mockPrisma.habit.findMany.mockResolvedValue([]);

    await processMissedOccurrences('2026-04-22', 30, 'user-abc');

    expect(mockPrisma.habit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'user-abc' }),
      })
    );
  });

  it('omits userId filter when not provided', async () => {
    mockPrisma.habit.findMany.mockResolvedValue([]);

    await processMissedOccurrences('2026-04-22');

    const callArgs = mockPrisma.habit.findMany.mock.calls[0][0] as {
      where: { userId?: string };
    };
    expect(callArgs.where.userId).toBeUndefined();
  });
});
