// A stale metric (Ben, 2026-11-25, programme D1): "go stale when it is
// more than 5 working days (M–F) after the end of its last period".
//
// As built, and as put to him: a metric is stale when a period of its
// cadence ENDED more than five working days ago and there is no reading
// in that period or since. So October's reading is due by the fifth
// working day of November; a week's by the following Friday; a daily
// metric after more than five working days without one.
//
// A MARK ONLY: stale changes no status. A metric that has never had a
// reading is not stale (it reads "No data", as before). Public holidays
// are not known here — only Saturdays and Sundays are skipped.
//
// PURE. Dates are yyyy-mm-dd and walked by calendar fields (DST).

import { bucketSpan, isoDate, parseDay } from "../../../shared/schema/buckets";

/** `n` calendar days on, by calendar fields — never milliseconds (a day
 *  is not 86 400 000 ms across a daylight-saving change). */
const addDays = (d: Date, n: number): Date => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export type StaleCadence = "shiftly" | "daily" | "weekly" | "monthly" | "annually";

/** How many working days a reading may be late. */
export const STALE_WORKING_DAYS = 5;

/** The Monday-to-Friday days after `from`, up to and including `to`. */
export function workingDaysAfter(from: string, to: string): number {
  if (to <= from) return 0;
  let d = parseDay(from);
  const end = parseDay(to);
  // whole weeks first, then the remainder day by day
  const days = Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  let n = Math.floor(days / 7) * 5;
  d = addDays(d, Math.floor(days / 7) * 7);
  for (let i = days % 7; i > 0; i--) {
    d = addDays(d, 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) n++;
  }
  return n;
}

/** The newest period of `cadence` whose reading is OVERDUE on `today`:
 *  it ended more than five working days ago. */
export function overduePeriod(cadence: StaleCadence, today: string): { from: string; to: string } {
  let span = bucketSpan(today, cadence);
  // at most a handful of steps: a period that has not ended, the one
  // before it, and for a daily metric the week behind
  for (let i = 0; i < 400; i++) {
    if (span.to < today && workingDaysAfter(span.to, today) > STALE_WORKING_DAYS) return span;
    span = bucketSpan(isoDate(addDays(parseDay(span.from), -1)), cadence);
  }
  return span;
}

/** Is a metric whose newest reading is dated `lastDate` stale on `today`?
 *  "" (never read) is not stale. */
export function isStale(lastDate: string, cadence: StaleCadence, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}/.test(lastDate)) return false;
  return lastDate.slice(0, 10) < overduePeriod(cadence, today).from;
}

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** "No reading for 9 weeks" — or "" when the metric is not stale. The
 *  span is the time since the newest reading. */
export function staleWords(lastDate: string, cadence: StaleCadence, today: string): string {
  if (!isStale(lastDate, cadence, today)) return "";
  const a = parseDay(lastDate);
  const b = parseDay(today);
  const days = Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000);
  const span = days >= 730 ? plural(Math.floor(days / 365), "year", "years") : days >= 91 ? plural(Math.floor(days / 30), "month", "months") : days >= 14 ? plural(Math.floor(days / 7), "week", "weeks") : plural(days, "day", "days");
  return `No reading for ${span}`;
}
