/**
 * Normalizes a date string to UTC midnight for use with Prisma @db.Date fields.
 * Prevents timezone-related off-by-one errors in South Africa (UTC+2).
 */
export function toUTCDate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/**
 * Returns the current date normalized to UTC midnight start-of-day.
 * For comparing `new Date()` against @db.Date fields in cron jobs.
 */
export function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
