const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Whole days from `from` to `to` (positive = `to` is in the future).
 * Deliberately computed in UTC, not the local timezone: this function runs
 * both server-side (Next.js) and client-side, and comparing calendar days in
 * UTC keeps the result identical regardless of which machine's TZ ran it.
 */
export function daysBetween(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const toUtc = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  return Math.round((toUtc - fromUtc) / MS_PER_DAY);
}

/** Days elapsed since `date` (always >= 0 for past dates). */
export function daysSince(date: Date, now: Date = new Date()): number {
  return daysBetween(date, now);
}

/** Days until `date` (negative if it is already in the past). */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return daysBetween(now, date);
}

export function isWithinNextDays(date: Date, days: number, now: Date = new Date()): boolean {
  const until = daysUntil(date, now);
  return until >= 0 && until <= days;
}

export function isOverdue(date: Date, now: Date = new Date()): boolean {
  return daysUntil(date, now) < 0;
}

/** YYYY-MM-DD in UTC — the storage/comparison format for week boundaries. */
export function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * The Monday–Sunday calendar week (UTC) containing `now`, as date-only
 * strings. Used to scope the Weekly Review (SPEC_followup section 23) so a
 * saved snapshot's range is unambiguous and reproducible.
 */
export function getWeekRange(now: Date = new Date()): { weekStart: string; weekEnd: string } {
  const day = now.getUTCDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + mondayOffset),
  );
  const sunday = new Date(
    Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6),
  );
  return { weekStart: toDateOnly(monday), weekEnd: toDateOnly(sunday) };
}

export function formatRelativeDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  if (days > 0) return `in ${days} days`;
  return `${Math.abs(days)} days ago`;
}
