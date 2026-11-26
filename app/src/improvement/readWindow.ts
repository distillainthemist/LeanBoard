// How much of a metric's history is read, and what a trend chart shows
// (the backlog programme, tranche 1, 2026-11-22). Pure.
//
//  - `readFrom`: the app read every reading a metric had ever had to
//    find its latest value and the sparkline's twelve points. It now
//    reads a window sized to the cadence, generous enough that the last
//    twelve readings are almost always inside it. A metric with nothing
//    in its window gets one small request for its latest reading, so an
//    old metric still shows its value and state.
//  - `chartWindow`: the Metrics card's chart showed the page around
//    today; a metric last filled in weeks ago opened nearly empty beside
//    a sparkline that showed its whole climb. The chart now reads the
//    last twelve readings THROUGH TO TODAY (the gap is drawn), unless
//    the last reading is too old for that to be readable.

import { addBuckets, bucketSpan, BucketCadence, isoDate, parseDay } from "../../../shared/schema/buckets";

/** "Everything": the read is not bounded. */
export const READ_FROM_START = "1900-01-01";

/** The first date read for a metric at this cadence (Ben, 2026-11-22):
 *  shift or daily six months, weekly two years, monthly five years,
 *  annually everything. By calendar fields, never milliseconds. */
export function readFrom(today: string, cadence: BucketCadence): string {
  const d = parseDay(today);
  if (cadence === "annually") return READ_FROM_START;
  if (cadence === "monthly") return isoDate(new Date(d.getFullYear() - 5, d.getMonth(), d.getDate()));
  if (cadence === "weekly") return isoDate(new Date(d.getFullYear() - 2, d.getMonth(), d.getDate()));
  return isoDate(new Date(d.getFullYear(), d.getMonth() - 6, d.getDate()));
}

/** How many readings a trend chart reaches back for. */
export const CHART_READINGS = 12;
/** A last reading more than this many periods old is "stale": drawing
 *  through to today would be mostly empty space. */
export const STALE_PERIODS = 13;

export interface ChartWindow {
  /** The dates the chart's readings are read between (inclusive). */
  from: string;
  to: string;
  /** "" = the chart's axis ends at today, as always. Otherwise the date
   *  of the last reading: the axis ends there, and the chart says so. */
  asOf: string;
}

/** What the chart reads. `readingDates`: the metric's ACTUAL reading
 *  dates in any order. `page`: the page around today (the window it
 *  had). `enteredDates`: the dates of every value anyone typed, plan
 *  included.
 *   - no readings: the page;
 *   - fewer than twelve readings (2026-11-27, report 24): the axis
 *     starts ONE EMPTY PERIOD before the first entered value — a yearly
 *     metric with one reading in 2026 opened on four empty years. A plan
 *     value typed ahead of the first actual counts (Ben's choice on R5's
 *     walk): nothing someone entered is cut off the chart;
 *   - twelve or more, last reading within STALE_PERIODS of today: from
 *     the twelfth-last reading's period (or the page's start, whichever
 *     is earlier) through to the page's end — the trend AND the gap;
 *   - older: through to the last reading's period, with `asOf` set. */
export function chartWindow(today: string, cadence: BucketCadence, readingDates: string[], page: { from: string; to: string }, enteredDates: string[] = []): ChartWindow {
  const clean = (list: string[]) => list.filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d)).map((d) => d.slice(0, 10)).sort();
  const dates = clean(readingDates);
  if (dates.length === 0) return { from: page.from, to: page.to, asOf: "" };
  const last = dates[dates.length - 1];
  const stale = addBuckets(last, cadence, STALE_PERIODS) < bucketSpan(today, cadence).from;
  let from: string;
  if (dates.length < CHART_READINGS) {
    const entered = clean(enteredDates);
    const first = entered.length > 0 && entered[0] < dates[0] ? entered[0] : dates[0];
    from = addBuckets(first, cadence, -1);
  } else {
    const twelfth = bucketSpan(dates[dates.length - CHART_READINGS], cadence).from;
    from = stale || twelfth < page.from ? twelfth : page.from;
  }
  if (stale) return { from, to: bucketSpan(last, cadence).to, asOf: last };
  return { from, to: page.to, asOf: "" };
}
