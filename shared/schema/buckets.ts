// Cadence buckets (grid entry, 2026-09-08) — shared so the KPI card
// (controls/) and the app agree on what "this week" means: ISO weeks
// Monday→Sunday, calendar months, calendar years; shiftly and daily are
// single days.

export type BucketCadence = "shiftly" | "daily" | "weekly" | "monthly" | "annually";

const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDay = (s: string): Date => new Date(`${s.slice(0, 10)}T00:00:00`);

/** The bucket a date falls in at a cadence: its span (inclusive). */
export function bucketSpan(date: string, cadence: BucketCadence): { from: string; to: string } {
  const d = parseDay(date);
  if (cadence === "shiftly" || cadence === "daily") return { from: isoDate(d), to: isoDate(d) };
  if (cadence === "weekly") {
    const day = (d.getDay() + 6) % 7; // Mon=0
    const from = new Date(d.getTime() - day * DAY);
    return { from: isoDate(from), to: isoDate(new Date(from.getTime() + 6 * DAY)) };
  }
  if (cadence === "monthly") {
    return { from: isoDate(new Date(d.getFullYear(), d.getMonth(), 1)), to: isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0)) };
  }
  return { from: `${d.getFullYear()}-01-01`, to: `${d.getFullYear()}-12-31` };
}

/** The anchor `n` buckets on from a date's bucket (negative = back). */
export function addBuckets(anchor: string, cadence: BucketCadence, n: number): string {
  const d = parseDay(bucketSpan(anchor, cadence).from);
  if (cadence === "shiftly" || cadence === "daily") return isoDate(new Date(d.getTime() + n * DAY));
  if (cadence === "weekly") return isoDate(new Date(d.getTime() + n * 7 * DAY));
  if (cadence === "monthly") return isoDate(new Date(d.getFullYear(), d.getMonth() + n, 1));
  return `${d.getFullYear() + n}-01-01`;
}

/** The reading date to offer by default (Ben, 2026-09-08): the current
 *  bucket's start, or the next bucket's when the current one already
 *  holds a reading (on that shift, when shifts apply). */
export function defaultReadingDate(today: string, cadence: BucketCadence, taken: (date: string) => boolean): string {
  const cur = bucketSpan(today, cadence).from;
  return taken(cur) ? addBuckets(cur, cadence, 1) : cur;
}

/** The trend chart's floor per cadence (Ben, 2026-10-28): the window is
 *  never shorter than this many buckets — a monthly card shows twelve
 *  months with two readings on it; more history shows in full. */
export const TREND_FLOOR: Record<BucketCadence, number> = { shiftly: 28, daily: 28, weekly: 13, monthly: 12, annually: 5 };

export interface TrendWindow {
  /** The first bucket's start. */
  from: string;
  /** The last bucket's start. */
  to: string;
  /** Every bucket start from `from` to `to`. */
  buckets: string[];
  /** Label every nth bucket (the first always). */
  labelEvery: number;
}

/** The window a trend draws: ending at the later of the last reading
 *  and today's bucket, starting at the earlier of the first reading
 *  and the floor — so the current period is always in view and a
 *  missed period shows as a gap. */
export function trendWindow(dates: string[], cadence: BucketCadence, today: string): TrendWindow {
  const starts = dates.filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => bucketSpan(d, cadence).from);
  const todayStart = bucketSpan(today, cadence).from;
  let to = todayStart;
  let from = todayStart;
  for (const st of starts) {
    if (st > to) to = st;
    if (st < from) from = st;
  }
  const floorFrom = addBuckets(to, cadence, -(TREND_FLOOR[cadence] - 1));
  if (floorFrom < from) from = floorFrom;
  const buckets: string[] = [];
  let cur = from;
  // a bounded walk: an absurd first reading (a typo'd year) cannot
  // make the chart walk thousands of buckets
  while (cur <= to && buckets.length < 400) {
    buckets.push(cur);
    cur = addBuckets(cur, cadence, 1);
  }
  const base = cadence === "shiftly" || cadence === "daily" ? 7 : cadence === "weekly" ? 2 : 1;
  const labelEvery = Math.max(base, Math.ceil(buckets.length / 13));
  return { from, to, buckets, labelEvery };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** An axis label for a bucket start: day-month for days and weeks, the
 *  month's name (with the year at January), the year for annual. */
export function trendTickLabel(bucketStart: string, cadence: BucketCadence): string {
  const d = parseDay(bucketStart);
  if (cadence === "annually") return String(d.getFullYear());
  if (cadence === "monthly") return d.getMonth() === 0 ? `${MONTHS[0]} ${String(d.getFullYear()).slice(2)}` : MONTHS[d.getMonth()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
