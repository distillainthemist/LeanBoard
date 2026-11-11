// The Gantt's window: which days it shows, how wide a day is, and how
// far one step back or forward moves it. Pure — no DOM — so the
// arithmetic is tested on its own.
//
// Days are whole numbers counted from 1970-01-01 in UTC. The Gantt used
// local-midnight milliseconds and added 86 400 000 per day; across a
// daylight-saving change that lands an hour short of the next midnight
// and names the wrong day. A 52-week window always crosses both changes,
// so the count moved to calendar days (2026-11-12).

export const DAY_MS = 86400000;

/** A window in weeks, or "all": every dated action in view at once. */
export type GanttRange = number | "all";

/** `dayW` = pixels per day; "all" works its own out from the room. */
export const GANTT_PRESETS: { range: GanttRange; label: string; title: string; dayW: number }[] = [
  { range: 2, label: "2w", title: "2 weeks", dayW: 44 },
  { range: 4, label: "4w", title: "4 weeks", dayW: 24 },
  { range: 8, label: "8w", title: "8 weeks", dayW: 13 },
  { range: 13, label: "13w", title: "13 weeks", dayW: 9 },
  { range: 26, label: "26w", title: "26 weeks", dayW: 5 },
  { range: 52, label: "52w", title: "52 weeks", dayW: 3 },
  { range: "all", label: "All", title: "Every action, first start to last due date", dayW: 0 },
];

/** Under this many pixels a day, week labels collide: the header names
 *  months and the rows carry month lines instead of weekend tints. */
export const MONTH_MODE_BELOW = 9;
/** "All" never shows more than this (156 weeks): past it the plot is
 *  wider than anyone scrolls, and the 52-week window pages instead. */
export const ALL_MAX_DAYS = 1092;
const ALL_MIN_DAY_W = 2;
const ALL_MAX_DAY_W = 44;

export function isGanttRange(v: unknown): v is GanttRange {
  return GANTT_PRESETS.some((p) => p.range === v);
}

/** yyyy-mm-dd → day number; null when it is not a date. */
export function dayNum(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? Math.round(t / DAY_MS) : null;
}
export function isoOfDay(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}
/** 0 = Sunday … 6 = Saturday. */
export function weekdayOf(n: number): number {
  return new Date(n * DAY_MS).getUTCDay();
}
export function addDaysIso(iso: string, n: number): string {
  const d = dayNum(iso);
  return d === null ? iso : isoOfDay(d + n);
}

/** The first and last day among these dates; blanks and junk are skipped. */
export function spanOf(dates: string[]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const iso of dates) {
    const d = dayNum(iso);
    if (d === null) continue;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return max === -Infinity ? null : { min, max };
}

export interface GanttWindow {
  /** first day shown */
  start: number;
  days: number;
  /** pixels per day */
  dayW: number;
  /** the header names months, not weeks */
  months: boolean;
  /** "all" ran past ALL_MAX_DAYS and shows only that much */
  clipped: boolean;
}

const mondayOnOrBefore = (d: number): number => d - ((weekdayOf(d) + 6) % 7);
const sundayOnOrAfter = (d: number): number => d + ((7 - weekdayOf(d)) % 7);

/** The window for a range. A week count centres on `anchor`; 26 and 52
 *  weeks narrow their days to fit `availPx`. "all" runs
 *  from the earliest date in `span` to the latest, with today inside and
 *  whole weeks either end, at whatever day width fills `availPx`; with
 *  nothing dated it falls back to four weeks. */
export function ganttWindow(
  range: GanttRange,
  anchor: number,
  span: { min: number; max: number } | null,
  today: number,
  availPx: number
): GanttWindow {
  if (range === "all" && span) {
    let lo = mondayOnOrBefore(Math.min(span.min, today) - 3);
    const hi = sundayOnOrAfter(Math.max(span.max, today) + 3);
    let days = Math.max(14, hi - lo + 1);
    let clipped = false;
    if (days > ALL_MAX_DAYS) {
      // keep today in view, half a year of history before it
      lo = mondayOnOrBefore(Math.min(Math.max(lo, today - 182), hi - ALL_MAX_DAYS + 1));
      days = ALL_MAX_DAYS;
      clipped = true;
    }
    const fit = Math.floor(((availPx > 0 ? availPx : 900) / days) * 10) / 10;
    const dayW = Math.min(ALL_MAX_DAY_W, Math.max(ALL_MIN_DAY_W, fit));
    return { start: lo, days, dayW, months: dayW < MONTH_MODE_BELOW, clipped };
  }
  const preset =
    GANTT_PRESETS.find((p) => p.range === (range === "all" ? 4 : range)) ?? GANTT_PRESETS[1];
  const days = (preset.range as number) * 7;
  // the long windows are for seeing the whole stretch at once: where the
  // plot is narrower than the preset they shrink to it rather than scroll
  let dayW = preset.dayW;
  if (dayW < MONTH_MODE_BELOW && availPx > 0) {
    dayW = Math.min(dayW, Math.max(ALL_MIN_DAY_W, Math.floor((availPx / days) * 10) / 10));
  }
  return {
    start: anchor - Math.floor(days / 2),
    days,
    dayW,
    months: preset.dayW < MONTH_MODE_BELOW,
    clipped: false,
  };
}

/** How many days ‹ and › move the window: half of it, in whole weeks, so
 *  what was at the edge lands in the middle. "all" has nowhere to go. */
export function pageStep(range: GanttRange): number {
  if (range === "all") return 0;
  return Math.max(1, Math.floor(range / 2)) * 7;
}

export interface GanttTick {
  day: number;
  /** days from the window's first day */
  offset: number;
  /** month ticks: say the year too (the first one shown, and each January) */
  year: boolean;
}

/** Header ticks: every Monday, or — in month mode — the first of every
 *  month, led by the window's own first day when the month it opens in
 *  has room for a name before the next one starts. */
export function ganttTicks(win: GanttWindow): GanttTick[] {
  const out: GanttTick[] = [];
  if (!win.months) {
    for (let d = 0; d < win.days; d++) if (weekdayOf(win.start + d) === 1) out.push({ day: win.start + d, offset: d, year: false });
    return out;
  }
  for (let d = 0; d < win.days; d++) {
    const iso = isoOfDay(win.start + d);
    if (iso.endsWith("-01")) out.push({ day: win.start + d, offset: d, year: iso.slice(5, 7) === "01" });
  }
  const room = Math.ceil(64 / win.dayW);
  if (out.length === 0 || out[0].offset >= room) out.unshift({ day: win.start, offset: 0, year: false });
  if (out.length > 0) out[0].year = true;
  return out;
}
