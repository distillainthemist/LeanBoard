// Cadence Current State — the pure model (docs/cadence-current-state-plan-2026-11.md).
// Graph calendar events in, normalised meetings out: what is dropped
// (cancelled, declined), what is confidential by default (sensitivity
// personal / private / confidential), how bodies are cleaned, how
// occurrences group into series and how a recurrence reads. No SDK, no
// DOM — every rule here is covered by src/__tests__/model.test.ts.

// ---- Graph shapes (the subset the scan selects) ---------------------------

export interface GraphAddress {
  name?: string;
  address?: string;
}

export interface GraphAttendee {
  type?: string; // required | optional | resource
  status?: { response?: string };
  emailAddress?: GraphAddress;
}

export interface GraphEvent {
  id?: string;
  subject?: string;
  start?: { dateTime?: string; timeZone?: string };
  end?: { dateTime?: string; timeZone?: string };
  isAllDay?: boolean;
  type?: string; // singleInstance | occurrence | exception | seriesMaster
  seriesMasterId?: string | null;
  sensitivity?: string; // normal | personal | private | confidential
  showAs?: string;
  isCancelled?: boolean;
  responseStatus?: { response?: string };
  organizer?: { emailAddress?: GraphAddress };
  attendees?: GraphAttendee[];
  location?: { displayName?: string };
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: string;
  body?: { contentType?: string; content?: string };
  categories?: string[];
  importance?: string;
  webLink?: string;
  /** UTC instants from Graph ("2026-10-27T22:00:00Z"): when the event reached
   *  this calendar (an invite's created time is when it was sent) and when it
   *  last changed (a reschedule — but also the person's own response). */
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

/** What the scan reads of a recurring series' master (/me/events/{id}):
 *  the pattern, when the series was created and its first start. */
export interface GraphSeriesMaster {
  recurrence?: GraphRecurrence;
  createdDateTime?: string;
  start?: { dateTime?: string; timeZone?: string };
}

export interface GraphRecurrence {
  pattern?: {
    type?: string; // daily | weekly | absoluteMonthly | relativeMonthly | absoluteYearly | relativeYearly
    interval?: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
    month?: number;
    index?: string; // first | second | third | fourth | last
  };
  range?: {
    type?: string; // endDate | noEnd | numbered
    startDate?: string;
    endDate?: string;
    numberOfOccurrences?: number;
  };
}

// ---- the normalised meeting --------------------------------------------------

export type AttendeeRole = "organizer" | "required" | "optional" | "resource";

export interface Attendee {
  name: string;
  email: string;
  role: AttendeeRole;
  /** accepted | tentativelyAccepted | declined | notResponded | none | organizer | "" */
  response: string;
  internal: boolean;
}

export interface Meeting {
  /** The Graph id — the screen's key; never exported. */
  key: string;
  /** The series master's Graph id, "" for a one-off. */
  seriesKey: string;
  kind: "one-off" | "recurring";
  subject: string;
  /** Local wall-clock times in the scan's time zone: yyyy-mm-ddThh:mm. */
  start: string;
  end: string;
  date: string;
  weekday: string;
  durationMinutes: number;
  isAllDay: boolean;
  showAs: string;
  myResponse: string;
  sensitivity: string;
  /** Sensitivity says confidential (the review's default flag). */
  confidentialByDefault: boolean;
  location: string;
  onlineProvider: string;
  organizer: { name: string; email: string };
  attendees: Attendee[];
  body: string;
  categories: string[];
  importance: string;
  webLink: string;
  /** When the invite reached the calendar and when it last changed, as
   *  wall-clock times in the scan's zone ("" when Graph gave none). */
  created: string;
  lastModified: string;
  /** Hours of notice (decision 2026-11-09): a one-off's start minus its
   *  created time; a moved occurrence's start minus its last change; null
   *  for an ordinary occurrence (the series row carries the series' notice)
   *  and when a time is missing. Negative when it was added after it started. */
  noticeHours: number | null;
  /** noticeHours known and under SHORT_NOTICE_HOURS. */
  shortNotice: boolean;
}

export type ExcludeReason = "cancelled" | "declined";

export const CONFIDENTIAL_SENSITIVITIES = new Set(["personal", "private", "confidential"]);

export function isConfidentialSensitivity(s: string | undefined): boolean {
  return CONFIDENTIAL_SENSITIVITIES.has((s ?? "").toLowerCase());
}

/** Why a meeting never reaches the list (Ben's decision 6), or null. */
export function excludeReason(ev: GraphEvent): ExcludeReason | null {
  if (ev.isCancelled === true) return "cancelled";
  if ((ev.responseStatus?.response ?? "").toLowerCase() === "declined") return "declined";
  return null;
}

// ---- times -------------------------------------------------------------------

/** Graph's "2026-11-03T09:00:00.0000000" (already in the requested zone)
 *  → "2026-11-03T09:00". */
export function wallClock(dateTime: string | undefined): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(dateTime ?? "");
  return m ? `${m[1]}T${m[2]}` : "";
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function wallMs(wall: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(wall);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

export function weekdayOf(wall: string): string {
  const ms = wallMs(wall.length === 10 ? `${wall}T00:00` : wall);
  return Number.isNaN(ms) ? "" : WEEKDAYS[new Date(ms).getUTCDay()];
}

/** Minutes between two wall-clock times (a DST change inside one meeting
 *  is not corrected — rare enough to ignore). */
export function minutesBetween(start: string, end: string): number {
  const a = wallMs(start);
  const b = wallMs(end);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 60000);
}

// ---- instants and notice ---------------------------------------------------------

/** Under this much notice a meeting is flagged "short notice". */
export const SHORT_NOTICE_HOURS = 24;

const PART_KEYS = ["year", "month", "day", "hour", "minute", "second"] as const;

function zoneParts(ms: number, timeZone: string): Record<(typeof PART_KEYS)[number], number> | null {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const out = {} as Record<(typeof PART_KEYS)[number], number>;
    for (const k of PART_KEYS) {
      const v = Number(parts.find((p) => p.type === k)?.value);
      if (!Number.isFinite(v)) return null;
      out[k] = v;
    }
    return out;
  } catch {
    return null; // an unknown zone
  }
}

/** The zone's offset from UTC at an instant, in ms (positive east). */
function zoneOffsetMs(ms: number, timeZone: string): number {
  const p = zoneParts(ms, timeZone);
  if (!p) return 0;
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

/** A UTC instant ("2026-10-27T22:00:00Z" or ms) as a wall-clock time in the
 *  zone, "yyyy-mm-ddThh:mm"; "" when it does not parse. */
export function toWall(instant: string | number | undefined, timeZone: string): string {
  const ms = typeof instant === "number" ? instant : Date.parse(instant ?? "");
  if (!Number.isFinite(ms)) return "";
  const p = zoneParts(ms, timeZone);
  if (!p) return new Date(ms).toISOString().slice(0, 16);
  const two = (n: number): string => String(n).padStart(2, "0");
  return `${p.year}-${two(p.month)}-${two(p.day)}T${two(p.hour)}:${two(p.minute)}`;
}

/** The instant (ms since the epoch) a wall-clock time in the zone names;
 *  NaN when it does not parse. Resolved by the zone's offset at that
 *  moment, re-checked once so a DST change the same night lands right. */
export function instantOf(wall: string, timeZone: string): number {
  const asUtc = wallMs(wall.length === 10 ? `${wall}T00:00` : wall);
  if (Number.isNaN(asUtc)) return Number.NaN;
  const first = asUtc - zoneOffsetMs(asUtc, timeZone);
  const again = asUtc - zoneOffsetMs(first, timeZone);
  return again;
}

/** Hours from a UTC instant to a wall-clock start in the zone, to one
 *  decimal; null when either is missing. Negative when the instant is later. */
export function hoursBefore(instant: string | undefined, startWall: string, timeZone: string): number | null {
  const a = Date.parse(instant ?? "");
  const b = instantOf(startWall, timeZone);
  if (!Number.isFinite(a) || Number.isNaN(b)) return null;
  return Math.round(((b - a) / 3600000) * 10) / 10;
}

export function isShortNotice(hours: number | null): boolean {
  return hours !== null && hours < SHORT_NOTICE_HOURS;
}

/** "5 h notice", "3 d notice", "added after it started"; "" when unknown. */
export function noticeText(hours: number | null): string {
  if (hours === null) return "";
  if (hours < 0) return "added after it started";
  if (hours < 1) return "under 1 h notice";
  if (hours < 48) return `${Math.round(hours)} h notice`;
  return `${Math.round(hours / 24)} d notice`;
}

// ---- bodies ------------------------------------------------------------------

/** A minimal HTML → text for the typed fallback (Graph's text body needs none). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/** Lines that open a Teams / Zoom / video-join block: everything from the
 *  first one to the end of the body is join boilerplate. */
const JOIN_BLOCK_START = [
  /^_{10,}\s*$/,
  /^Microsoft Teams( meeting| Need help\?)?\s*$/i,
  /^Microsoft Teams Need help\?/i,
  /^Join (the meeting now|on your computer|Zoom Meeting|with a video conferencing device)/i,
  /^Join Microsoft Teams Meeting/i,
];

/** Single lines that are join details wherever they sit. */
const JOIN_LINE = [
  /teams\.microsoft\.com\/l\/meetup-join/i,
  /zoom\.us\/j\//i,
  /^Meeting ID:/i,
  /^Passcode:/i,
  /^Dial[- ]in by phone/i,
  /^Join by phone/i,
  /^One tap mobile/i,
  /^Dial by your location/i,
  /^Find your local number/i,
  /^Phone conference ID:/i,
  /^For organizers: Meeting options/i,
  /^Learn [Mm]ore\s*\|/,
];

/** Ben's decision 5: text, join boilerplate stripped, full length. */
export function cleanBody(raw: string, isHtml = false): string {
  const text = (isHtml ? htmlToText(raw) : raw).replace(/\r\n?/g, "\n");
  const lines = text.split("\n").map((l) => l.replace(/\s+$/, ""));
  const cut = lines.findIndex((l) => JOIN_BLOCK_START.some((re) => re.test(l.trim())));
  const kept = (cut >= 0 ? lines.slice(0, cut) : lines).filter((l) => !JOIN_LINE.some((re) => re.test(l.trim())));
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---- people ------------------------------------------------------------------

export function domainOf(email: string): string {
  const at = email.lastIndexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

export function isInternal(email: string, internalDomains: string[]): boolean {
  const d = domainOf(email);
  return d !== "" && internalDomains.some((x) => d === x || d.endsWith(`.${x}`));
}

const ROLE_OF: Record<string, AttendeeRole> = { required: "required", optional: "optional", resource: "resource" };

function attendeesOf(ev: GraphEvent, internalDomains: string[]): Attendee[] {
  const orgEmail = (ev.organizer?.emailAddress?.address ?? "").toLowerCase();
  const out: Attendee[] = [];
  const seen = new Set<string>();
  const push = (a: Omit<Attendee, "internal">): void => {
    const key = a.email || a.name;
    if (key === "" || seen.has(key)) return;
    seen.add(key);
    out.push({ ...a, internal: isInternal(a.email, internalDomains) });
  };
  if (orgEmail !== "" || ev.organizer?.emailAddress?.name) {
    push({ name: ev.organizer?.emailAddress?.name ?? "", email: orgEmail, role: "organizer", response: "organizer" });
  }
  for (const a of ev.attendees ?? []) {
    const email = (a.emailAddress?.address ?? "").toLowerCase();
    if (email !== "" && email === orgEmail) continue; // the organizer is listed once, as organizer
    push({
      name: a.emailAddress?.name ?? "",
      email,
      role: ROLE_OF[(a.type ?? "").toLowerCase()] ?? "required",
      response: a.status?.response ?? "",
    });
  }
  return out;
}

// ---- normalise ------------------------------------------------------------------

export interface NormaliseContext {
  internalDomains: string[];
  /** The scan's zone: start/end are wall-clock times in it. */
  timeZone: string;
}

export function normalise(ev: GraphEvent, ctx: NormaliseContext): Meeting {
  const start = wallClock(ev.start?.dateTime);
  const end = wallClock(ev.end?.dateTime);
  const seriesKey = ev.seriesMasterId ?? "";
  const isHtml = (ev.body?.contentType ?? "").toLowerCase() === "html";
  const recurring = seriesKey !== "" || ev.type === "occurrence" || ev.type === "exception";
  // an ordinary occurrence inherits its master's created time, so its own
  // notice means nothing; a moved one counts from the move
  const noticeHours = !recurring ? hoursBefore(ev.createdDateTime, start, ctx.timeZone) : ev.type === "exception" ? hoursBefore(ev.lastModifiedDateTime, start, ctx.timeZone) : null;
  return {
    key: ev.id ?? `${start}|${ev.subject ?? ""}`,
    seriesKey,
    kind: recurring ? "recurring" : "one-off",
    subject: (ev.subject ?? "").trim(),
    start,
    end,
    date: start.slice(0, 10),
    weekday: weekdayOf(start),
    durationMinutes: minutesBetween(start, end),
    isAllDay: ev.isAllDay === true,
    showAs: ev.showAs ?? "",
    myResponse: ev.responseStatus?.response ?? "",
    sensitivity: (ev.sensitivity ?? "normal").toLowerCase(),
    confidentialByDefault: isConfidentialSensitivity(ev.sensitivity),
    location: (ev.location?.displayName ?? "").trim(),
    onlineProvider: ev.isOnlineMeeting === false ? "" : ev.onlineMeetingProvider && ev.onlineMeetingProvider !== "unknown" ? ev.onlineMeetingProvider : "",
    organizer: { name: ev.organizer?.emailAddress?.name ?? "", email: (ev.organizer?.emailAddress?.address ?? "").toLowerCase() },
    attendees: attendeesOf(ev, ctx.internalDomains),
    body: cleanBody(ev.body?.content ?? "", isHtml),
    categories: ev.categories ?? [],
    importance: ev.importance ?? "",
    webLink: ev.webLink ?? "",
    created: toWall(ev.createdDateTime, ctx.timeZone),
    lastModified: toWall(ev.lastModifiedDateTime, ctx.timeZone),
    noticeHours,
    shortNotice: isShortNotice(noticeHours),
  };
}

export interface Normalised {
  meetings: Meeting[];
  excluded: Record<ExcludeReason, number>;
}

/** Every event in, the listable meetings (sorted by start) and the
 *  dropped counts out. Series masters never come from a calendar view,
 *  but one that slips in is skipped. */
export function normaliseAll(events: GraphEvent[], ctx: NormaliseContext): Normalised {
  const excluded: Record<ExcludeReason, number> = { cancelled: 0, declined: 0 };
  const meetings: Meeting[] = [];
  const seen = new Set<string>();
  for (const ev of events) {
    if (ev.type === "seriesMaster") continue;
    const why = excludeReason(ev);
    if (why) {
      excluded[why]++;
      continue;
    }
    const m = normalise(ev, ctx);
    if (seen.has(m.key)) continue;
    seen.add(m.key);
    meetings.push(m);
  }
  meetings.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.subject.localeCompare(b.subject)));
  return { meetings, excluded };
}

// ---- recurrence -------------------------------------------------------------------

const DAY_SHORT: Record<string, string> = {
  sunday: "Sun", monday: "Mon", tuesday: "Tue", wednesday: "Wed", thursday: "Thu", friday: "Fri", saturday: "Sat",
};
const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function days(list: string[] | undefined): string {
  const ds = (list ?? []).map((d) => d.toLowerCase()).filter((d) => d in DAY_SHORT);
  ds.sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  return ds.map((d) => DAY_SHORT[d]).join(", ");
}

/** "Weekly on Tue, Thu until 2026-12-18", "Every 2 weeks on Mon", … */
export function recurrenceText(rec: GraphRecurrence | undefined): string {
  const p = rec?.pattern;
  if (!p?.type) return "";
  const n = typeof p.interval === "number" && p.interval > 1 ? p.interval : 1;
  const every = (one: string, many: string): string => (n === 1 ? one : `Every ${n} ${many}`);
  let text: string;
  switch (p.type) {
    case "daily":
      text = every("Daily", "days");
      break;
    case "weekly": {
      const d = days(p.daysOfWeek);
      text = `${every("Weekly", "weeks")}${d ? ` on ${d}` : ""}`;
      break;
    }
    case "absoluteMonthly":
      text = `${every("Monthly", "months")} on day ${p.dayOfMonth ?? "?"}`;
      break;
    case "relativeMonthly":
      text = `${every("Monthly", "months")} on the ${p.index ?? "first"} ${days(p.daysOfWeek) || "day"}`;
      break;
    case "absoluteYearly":
      text = `${every("Yearly", "years")} on ${p.dayOfMonth ?? "?"} ${MONTHS[(p.month ?? 1) - 1] ?? ""}`.trim();
      break;
    case "relativeYearly":
      text = `${every("Yearly", "years")} on the ${p.index ?? "first"} ${days(p.daysOfWeek) || "day"} of ${MONTHS[(p.month ?? 1) - 1] ?? ""}`.trim();
      break;
    default:
      text = p.type;
  }
  const r = rec?.range;
  if (r?.type === "endDate" && r.endDate) text += ` until ${r.endDate}`;
  else if (r?.type === "numbered" && r.numberOfOccurrences) text += `, ${r.numberOfOccurrences} times`;
  return text;
}

// ---- grouping -------------------------------------------------------------------------

export interface MeetingGroup {
  /** The series key, or the meeting key for a one-off. */
  key: string;
  kind: "series" | "one-off";
  subject: string;
  recurrence: string;
  meetings: Meeting[];
  /** When the invite (the series master, for a series) reached the calendar
   *  and the first start it was issued for — wall clock, "" when unknown. */
  created: string;
  firstStart: string;
  /** A series: created → its first meeting ever (from the master; null when
   *  the master could not be read). A one-off: the meeting's own. */
  noticeHours: number | null;
  shortNotice: boolean;
}

/** Series first (most occurrences first), then one-offs by start. */
export function groupMeetings(meetings: Meeting[], masters: Map<string, GraphSeriesMaster>, ctx: NormaliseContext): MeetingGroup[] {
  const series = new Map<string, Meeting[]>();
  const oneOffs: MeetingGroup[] = [];
  for (const m of meetings) {
    if (m.seriesKey === "") {
      oneOffs.push({
        key: m.key, kind: "one-off", subject: m.subject, recurrence: "", meetings: [m],
        created: m.created, firstStart: m.start, noticeHours: m.noticeHours, shortNotice: m.shortNotice,
      });
      continue;
    }
    const list = series.get(m.seriesKey) ?? [];
    list.push(m);
    series.set(m.seriesKey, list);
  }
  const groups: MeetingGroup[] = [...series.entries()].map(([key, list]) => {
    const master = masters.get(key);
    // occurrences inherit the master's created time, so one stands in when the master was not read
    const created = master?.createdDateTime ? toWall(master.createdDateTime, ctx.timeZone) : (list.find((m) => m.created !== "")?.created ?? "");
    const firstStart = wallClock(master?.start?.dateTime);
    const noticeHours = master?.createdDateTime && firstStart !== "" ? hoursBefore(master.createdDateTime, firstStart, ctx.timeZone) : null;
    return {
      key,
      kind: "series" as const,
      // the most common subject (an exception can be renamed)
      subject: mostCommon(list.map((m) => m.subject)),
      recurrence: recurrenceText(master?.recurrence) || "Recurring",
      meetings: list,
      created,
      firstStart,
      noticeHours,
      shortNotice: isShortNotice(noticeHours),
    };
  });
  groups.sort((a, b) => b.meetings.length - a.meetings.length || a.subject.localeCompare(b.subject));
  return [...groups, ...oneOffs];
}

function mostCommon(xs: string[]): string {
  const n = new Map<string, number>();
  for (const x of xs) n.set(x, (n.get(x) ?? 0) + 1);
  let best = "";
  let bestN = -1;
  for (const [x, c] of n) if (c > bestN) [best, bestN] = [x, c];
  return best;
}

// ---- period --------------------------------------------------------------------------

export const MAX_PERIOD_DAYS = 366;

/** yyyy-mm-dd ± whole months, clamped to the month's last day. */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both included. */
export function periodDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / 86400000) + 1;
}

/** null when the period is valid, else what is wrong with it (decision 2). */
export function periodProblem(from: string, to: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return "Choose both dates.";
  const n = periodDays(from, to);
  if (!(n >= 1)) return "The end date is before the start date.";
  if (n > MAX_PERIOD_DAYS) return "The period can be at most 12 months.";
  return null;
}
