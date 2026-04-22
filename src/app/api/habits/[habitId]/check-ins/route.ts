/**
 * Habit Check-In API Route
 *
 * POST /api/habits/[habitId]/check-ins
 *
 * Creates or updates the check-in for a given habit on a specific date.
 *
 * When the check-in date is a scheduled occurrence:
 *   1. The missed occurrence handler (`processMissedOccurrencesForHabit`) is
 *      invoked first to back-fill any scheduled days between the habit's last
 *      known check-in and the day *before* this check-in. This covers the
 *      offline-sync scenario where a user was away for several days and
 *      submits a delayed check-in.
 *   2. The streak engine (`recalculateStreakState`) is then called with the
 *      current check-in date as the reference to compute accurate streak
 *      fields, which are persisted back to the Habit row.
 *
 * GET /api/habits/[habitId]/check-ins
 *
 * Returns all check-ins for the habit, ordered by date descending.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { recalculateStreakState } from '@/lib/streaks/recalculate';
import { processMissedOccurrencesForHabit } from '@/lib/streaks/process-missed';
import type { CheckIn } from '@/lib/streaks/types';
import { isScheduledDay, addDays } from '@/lib/streaks/utils';
import type { DayOfWeek } from '@/lib/streaks/types';

// ─── Validation ───────────────────────────────────────────────────────────────

const createCheckInSchema = z.object({
  /** ISO date string (YYYY-MM-DD) the check-in covers. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD format'),
  /** Whether the habit was completed on this date. */
  completed: z.boolean(),
  /** Optional note for the check-in. */
  note: z.string().max(500, 'Note must be 500 characters or fewer').optional(),
  /**
   * Sync status override for offline writes.
   * "synced" (default) | "pending" | "conflict"
   */
  syncStatus: z.enum(['synced', 'pending', 'conflict']).default('synced'),
});

// ─── Route Params ─────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ habitId: string }>;
}

// ─── POST — Create or update a check-in ──────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await context.params;

    // ── Load habit & verify ownership ─────────────────────────────────────────
    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    if (habit.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── Parse & validate request body ─────────────────────────────────────────
    const body = await request.json();
    const parseResult = createCheckInSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { date, completed, note, syncStatus } = parseResult.data;

    // ── Parse habit's scheduledDays (stored as JSON string in DB) ─────────────
    let scheduledDays: DayOfWeek[];
    try {
      scheduledDays = JSON.parse(habit.scheduledDays) as DayOfWeek[];
    } catch {
      scheduledDays = [0, 1, 2, 3, 4, 5, 6] as DayOfWeek[];
    }

    // ── Persist check-in (upsert — one record per habit per date) ─────────────
    const checkIn = await prisma.habitCheckIn.upsert({
      where: {
        habitId_date: { habitId, date },
      },
      create: {
        habitId,
        date,
        completed,
        note: note ?? null,
        syncStatus,
        recordedAt: new Date(),
      },
      update: {
        completed,
        note: note !== undefined ? note : undefined,
        syncStatus,
        recordedAt: new Date(),
      },
    });

    // ── Invoke missed occurrence handler + streak engine for scheduled dates ──
    //
    // Per AC 90302 Sub-AC 2: when a scheduled occurrence is detected (either
    // by the user submitting a check-in or by the scheduled job), the missed
    // occurrence handler is first called to back-fill any unrecorded scheduled
    // days *before* this check-in date. This ensures streak recalculation has
    // a complete picture of all past occurrences, which is critical for the
    // offline-sync scenario where check-ins arrive out of order.
    //
    // After back-filling past misses, the streak engine is invoked with the
    // current check-in date as the reference to produce accurate streak fields.
    const isScheduled = isScheduledDay(date, scheduledDays);

    if (isScheduled) {
      // ── Step 1: Back-fill any missed scheduled occurrences before this date ──
      //
      // `processMissedOccurrencesForHabit` detects scheduled days in the
      // lookback window that have no check-in record and creates explicit
      // `completed: false` records for them. It uses `date` (the check-in
      // date) as the exclusive upper bound, so today's occurrence is handled
      // by the check-in being recorded below — not treated as a miss.
      //
      // We pass `date` as the referenceDate so the function scans up to (but
      // not including) the current check-in date. The streak recalculation at
      // the end of this block then uses `date` to include today's completed
      // state.
      await processMissedOccurrencesForHabit(
        habitId,
        date, // exclusive upper bound: back-fill up to (not including) today
        30    // look back 30 days for offline-sync scenarios
      );

      // ── Step 2: Fetch the full (now back-filled) check-in history ────────────
      const allCheckIns = await prisma.habitCheckIn.findMany({
        where: { habitId },
        select: { date: true, completed: true, recordedAt: true },
        orderBy: { date: 'asc' },
      });

      // Map to the CheckIn type expected by the streak engine
      const streakCheckIns: CheckIn[] = allCheckIns.map((ci) => ({
        date: ci.date,
        completed: ci.completed,
        recordedAt: ci.recordedAt.toISOString(),
      }));

      // ── Step 3: Invoke the streak engine ─────────────────────────────────────
      //
      // `recalculateStreakState` is the canonical streak engine entry point.
      // It builds the StreakConfig from habit settings, dispatches to the
      // appropriate mode calculator (strict / one-grace / percentage), derives
      // graceUsedWeek for one-grace mode, and returns DB-ready streak fields.
      const streakUpdate = recalculateStreakState(
        {
          streakMode: habit.streakMode,
          percentageThreshold: habit.percentageThreshold,
          scheduledDays,
          timezone: habit.timezone,
        },
        streakCheckIns,
        date // reference date: the date of the check-in being recorded
      );

      // ── Step 4: Persist updated streak state back to the Habit row ────────────
      //
      // Capture the write result so we can confirm the persisted streakCount
      // matches the recalculated value. Prisma's `update` throws if the row is
      // missing, guaranteeing an observable failure rather than a silent no-op.
      const persistedHabit = await prisma.habit.update({
        where: { id: habitId },
        data: {
          streakCount: streakUpdate.streakCount,
          longestStreak: streakUpdate.longestStreak,
          currentStreakStartDate: streakUpdate.currentStreakStartDate,
          lastCompletedDate: streakUpdate.lastCompletedDate,
          graceUsedWeek: streakUpdate.graceUsedWeek,
        },
        select: { streakCount: true },
      });

      // Confirm the write: the DB-returned streakCount must match what the
      // streak engine computed. A mismatch would indicate a concurrent write
      // conflict or a bug in the update payload.
      const writeConfirmed = persistedHabit.streakCount === streakUpdate.streakCount;

      return NextResponse.json(
        {
          checkIn,
          streakRecalculated: true,
          streak: streakUpdate,
          persistedStreakCount: persistedHabit.streakCount,
          writeConfirmed,
        },
        { status: 201 }
      );
    }

    // Not a scheduled day — save check-in but skip streak recalculation
    return NextResponse.json(
      {
        checkIn,
        streakRecalculated: false,
        message: `${date} is not a scheduled day for this habit; streak unchanged.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to save habit check-in:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

// ─── GET — List check-ins for a habit ────────────────────────────────────────

export async function GET(
  _request: NextRequest,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { habitId } = await context.params;

    const habit = await prisma.habit.findUnique({
      where: { id: habitId },
      select: { userId: true },
    });

    if (!habit) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }

    if (habit.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const checkIns = await prisma.habitCheckIn.findMany({
      where: { habitId },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json({ checkIns });
  } catch (error) {
    console.error('Failed to fetch habit check-ins:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
