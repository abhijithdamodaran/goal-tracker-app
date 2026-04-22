/**
 * Streak Calculation Utilities
 *
 * Date helpers used by streak calculators.
 */

import { DayOfWeek } from './types';

/** Parse an ISO date string ('YYYY-MM-DD') into a Date at midnight UTC */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Format a Date to an ISO date string ('YYYY-MM-DD') */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Get today's date as an ISO date string */
export function todayStr(): string {
  return formatDate(new Date());
}

/** Calculate the number of calendar days between two ISO date strings */
export function daysBetween(dateA: string, dateB: string): number {
  const a = parseDate(dateA);
  const b = parseDate(dateB);
  const msPerDay = 86_400_000;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}

/** Add N days to a date string, returning a new ISO date string */
export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

/** Get the day of the week (0=Sunday..6=Saturday) for an ISO date string */
export function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getUTCDay();
}

/**
 * Check if a date is a scheduled day based on the configured schedule.
 * If no scheduledDays provided, every day is scheduled.
 */
export function isScheduledDay(
  dateStr: string,
  scheduledDays?: DayOfWeek[]
): boolean {
  if (!scheduledDays || scheduledDays.length === 0) {
    return true; // Every day is scheduled by default
  }
  const dow = getDayOfWeek(dateStr) as DayOfWeek;
  return scheduledDays.includes(dow);
}

/**
 * Build a Set of completed date strings from check-in records.
 * Only includes check-ins where completed === true.
 */
export function buildCompletedSet(
  checkIns: { date: string; completed: boolean }[]
): Set<string> {
  const set = new Set<string>();
  for (const ci of checkIns) {
    if (ci.completed) {
      set.add(ci.date);
    }
  }
  return set;
}

/**
 * Sort date strings in ascending order (earliest first).
 * Returns a new array; does not mutate.
 */
export function sortDatesAsc(dates: string[]): string[] {
  return [...dates].sort();
}

/**
 * Get the Monday-based ISO week start (Monday) for a given date string.
 * Weeks run Monday–Sunday.
 */
export function getWeekStart(dateStr: string): string {
  const dow = getDayOfWeek(dateStr);
  // Monday = 1, so offset is (dow + 6) % 7 days back to Monday
  // Sunday (0) → 6 days back, Monday (1) → 0 days back, etc.
  const daysBack = (dow + 6) % 7;
  return addDays(dateStr, -daysBack);
}

/**
 * Convert an ISO date string to an ISO 8601 week string in the format "YYYY-Www".
 * Weeks are Monday–Sunday per ISO 8601. Week 1 is the week containing the first Thursday.
 *
 * @example toISOWeekString('2026-04-20') // Monday Apr 20 → '2026-W17'
 * @example toISOWeekString('2026-04-19') // Sunday Apr 19 → '2026-W16'
 */
export function toISOWeekString(dateStr: string): string {
  const date = parseDate(dateStr);

  // The ISO week year is identified by the Thursday of that week.
  // Shift date to Thursday: Thursday = day 4; offset = (4 - day + 7) % 7 - but
  // we use Monday = 1..Sunday = 7 in ISO, so: Thursday offset from Mon-based week.
  // Simpler: move to the nearest Thursday (ISO week owner).
  const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // ISO Mon=1..Sun=7: convert Sunday 0 → 7
  const isoDow = dayOfWeek === 0 ? 7 : dayOfWeek;
  // Thursday is isoDow 4; offset to this week's Thursday
  const thursday = new Date(date.getTime() + (4 - isoDow) * 86_400_000);

  const isoYear = thursday.getUTCFullYear();

  // Jan 4 of the ISO year is always in week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4Dow = jan4.getUTCDay() === 0 ? 7 : jan4.getUTCDay();
  // Monday of week 1
  const week1Mon = new Date(jan4.getTime() - (jan4Dow - 1) * 86_400_000);

  const msPerWeek = 7 * 86_400_000;
  // Monday of the input date's week
  const inputWeekMon = new Date(date.getTime() - (isoDow - 1) * 86_400_000);

  const weekNumber = Math.round((inputWeekMon.getTime() - week1Mon.getTime()) / msPerWeek) + 1;

  return `${isoYear}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get all scheduled dates within a week (Mon–Sun) starting from weekStart.
 */
export function getScheduledDatesInWeek(
  weekStart: string,
  scheduledDays?: DayOfWeek[]
): string[] {
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (isScheduledDay(d, scheduledDays)) {
      dates.push(d);
    }
  }
  return dates;
}

/**
 * Count completions in a given week (Mon-Sun starting from weekStart).
 * Only counts dates that are scheduled AND on or before refDate.
 */
export function countWeekCompletions(
  weekStart: string,
  completedSet: Set<string>,
  scheduledDays?: DayOfWeek[],
  refDate?: string
): { completed: number; scheduled: number; missed: number } {
  let completed = 0;
  let scheduled = 0;

  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    if (refDate && d > refDate) break;
    if (isScheduledDay(d, scheduledDays)) {
      scheduled++;
      if (completedSet.has(d)) {
        completed++;
      }
    }
  }

  return { completed, scheduled, missed: scheduled - completed };
}
