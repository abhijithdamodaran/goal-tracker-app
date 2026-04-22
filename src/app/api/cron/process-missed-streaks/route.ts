/**
 * Scheduled Job: Process Missed Streak Occurrences
 *
 * POST /api/cron/process-missed-streaks
 *
 * Called by a nightly cron job (e.g., Vercel Cron or an external scheduler)
 * to sweep all active habits, detect scheduled occurrences that passed
 * without a check-in, record explicit "missed" check-in entries, and
 * invoke the streak engine's recalculation function to keep denormalised
 * streak state accurate.
 *
 * Authentication
 * ──────────────
 * Requests must carry the CRON_SECRET in the Authorization header:
 *
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Set CRON_SECRET in your environment. On Vercel, cron invocations include
 * this header automatically when you configure it in vercel.json.
 *
 * Query parameters
 * ────────────────
 * - referenceDate  (optional) ISO YYYY-MM-DD upper bound (exclusive) for miss
 *                  detection. Defaults to today, which processes through
 *                  yesterday's scheduled occurrences.
 * - lookbackDays   (optional) Integer. How many days back to scan. Default 30.
 * - userId         (optional) UUID. Restrict processing to a single user's
 *                  habits (useful for debugging or manual backfill).
 */

import { NextRequest, NextResponse } from 'next/server';
import { processMissedOccurrences } from '@/lib/streaks/process-missed';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_LOOKBACK_DAYS = 90;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // ── Authenticate ───────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[cron/process-missed-streaks] CRON_SECRET env var not set');
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token || token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ── Parse query parameters ─────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);

  const referenceDate = searchParams.get('referenceDate') ?? undefined;

  if (referenceDate && !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
    return NextResponse.json(
      { error: 'referenceDate must be ISO YYYY-MM-DD format' },
      { status: 400 }
    );
  }

  const lookbackParam = searchParams.get('lookbackDays');
  let lookbackDays = 30;
  if (lookbackParam !== null) {
    const parsed = parseInt(lookbackParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > MAX_LOOKBACK_DAYS) {
      return NextResponse.json(
        { error: `lookbackDays must be an integer between 1 and ${MAX_LOOKBACK_DAYS}` },
        { status: 400 }
      );
    }
    lookbackDays = parsed;
  }

  const userId = searchParams.get('userId') ?? undefined;

  // ── Run the missed occurrence handler ──────────────────────────────────────
  try {
    console.log('[cron/process-missed-streaks] Starting', {
      referenceDate,
      lookbackDays,
      userId,
    });

    const result = await processMissedOccurrences(
      referenceDate,
      lookbackDays,
      userId
    );

    console.log('[cron/process-missed-streaks] Complete', {
      habitsScanned: result.habitsScanned,
      habitsWithNewMisses: result.habitsWithNewMisses,
      totalMissedRecordsCreated: result.totalMissedRecordsCreated,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('[cron/process-missed-streaks] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while processing missed streaks.' },
      { status: 500 }
    );
  }
}

// ─── Vercel Cron schedule hint ─────────────────────────────────────────────────
// Add to vercel.json:
//
// {
//   "crons": [
//     {
//       "path": "/api/cron/process-missed-streaks",
//       "schedule": "0 4 * * *"   ← runs at 04:00 UTC every day
//     }
//   ]
// }
