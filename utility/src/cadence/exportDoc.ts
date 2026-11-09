// Cadence Current State — what leaves the app (decisions 4, 5, 9).
// One export document, written as JSON (the main export) or as an Excel
// workbook with the same content. Pure: the screen hands in the meetings,
// the groups and the person's ticks; masking happens HERE, once, so a
// confidential meeting can never reach either format with its details.

import type { CellValue, SheetSpec } from "../../../shared/export/xlsx";
import type { Meeting, MeetingGroup, ExcludeReason } from "./model";

export const CONFIDENTIAL_SUBJECT = "Confidential";
/** Excel's cell limit is 32,767 characters; JSON carries the full body. */
export const EXCEL_TEXT_CAP = 32000;

export interface ExportInput {
  groups: MeetingGroup[];
  /** Meeting keys the person left ticked. */
  included: Set<string>;
  /** Meeting keys exported masked. */
  confidential: Set<string>;
  excluded: Record<ExcludeReason, number>;
  period: { from: string; to: string };
  timeZone: string;
  internalDomains: string[];
  generatedAt: string;
  generatedBy: string;
  appVersion: string;
  /** "graph" (full detail) or "typed" (the fallback: no per-attendee response). */
  road: "graph" | "typed";
}

export interface ExportAttendee {
  name: string;
  email: string;
  role: string;
  response: string;
  internal: boolean;
}

export interface ExportMeeting {
  meetingId: string;
  seriesId: string | null;
  kind: "one-off" | "recurring";
  confidential: boolean;
  subject: string;
  start: string;
  end: string;
  date: string;
  weekday: string;
  durationMinutes: number;
  isAllDay: boolean;
  recurrence: string;
  showAs: string;
  myResponse: string;
  sensitivity: string;
  location: string;
  onlineProvider: string;
  organizer: { name: string; email: string } | null;
  attendeeCount: number | null;
  internalCount: number | null;
  externalCount: number | null;
  attendees: ExportAttendee[];
  categories: string[];
  importance: string;
  body: string;
  created: string;
  lastModified: string;
  noticeHours: number | null;
  shortNotice: boolean;
}

export interface ExportSeries {
  seriesId: string;
  confidential: boolean;
  subject: string;
  recurrence: string;
  occurrencesInPeriod: number;
  hoursInPeriod: number;
  typicalDurationMinutes: number;
  firstInPeriod: string;
  lastInPeriod: string;
  organizer: { name: string; email: string } | null;
  distinctAttendees: number | null;
  created: string;
  firstStart: string;
  noticeHours: number | null;
  shortNotice: boolean;
}

export interface ExportDoc {
  about: {
    tool: string;
    version: string;
    generatedAt: string;
    generatedBy: string;
    period: { from: string; to: string; timeZone: string };
    internalDomains: string[];
    source: string;
    rules: string[];
    counts: {
      meetingsListed: number;
      meetingsExported: number;
      untickedByReviewer: number;
      droppedCancelled: number;
      droppedDeclined: number;
      confidential: number;
      series: number;
      oneOffs: number;
      hoursExported: number;
      shortNoticeMeetings: number;
      shortNoticeSeries: number;
    };
    fields: Record<string, string>;
  };
  series: ExportSeries[];
  meetings: ExportMeeting[];
}

export const FIELD_DICTIONARY: Record<string, string> = {
  meetingId: "Stable id within this export (M1, M2, …), in start order.",
  seriesId: "The recurring series the meeting belongs to (S1, S2, …); null for a one-off. Join to series[].seriesId.",
  kind: "one-off or recurring.",
  confidential: "true when the meeting was masked: subject reads Confidential and every detail other than timing and recurrence is blank.",
  start: "Start, local wall-clock time in about.period.timeZone (yyyy-mm-ddThh:mm).",
  end: "End, same zone and format.",
  weekday: "Day of the week of the start.",
  durationMinutes: "End minus start in minutes (all-day meetings count 1440 a day).",
  recurrence: "The series pattern in words, e.g. 'Weekly on Tue, Thu until 2026-12-18'.",
  showAs: "How the time shows in the calendar: free, tentative, busy, oof, workingElsewhere.",
  myResponse: "The exporting person's own response: organizer, accepted, tentativelyAccepted, notResponded, none.",
  sensitivity: "Outlook sensitivity: normal, personal, private, confidential.",
  onlineProvider: "teamsForBusiness, skypeForBusiness, … or blank for an in-person meeting.",
  "attendees[].role": "organizer, required, optional or resource (a room or equipment).",
  "attendees[].response": "accepted, tentativelyAccepted, declined, notResponded, none, organizer.",
  "attendees[].internal": "true when the address is in one of about.internalDomains.",
  body: "The meeting text as plain text, Teams/Zoom join details removed, full length (the Excel copy is cut at 32,000 characters).",
  created: "When the invite reached the person's calendar (for a received invite, when it was sent), same zone and format as start; blank when the calendar gave none.",
  lastModified: "When the meeting last changed in the person's calendar — a reschedule or update, but also the person's own response.",
  noticeHours: "Hours of notice, one decimal: a one-off's start minus created; a moved occurrence's start minus lastModified; null for an ordinary occurrence of a series (see series[].noticeHours). Negative when the meeting was added after it started.",
  shortNotice: "true when noticeHours is known and under 24.",
  "series[].created": "When the series was created (its master's created time).",
  "series[].firstStart": "The series' first meeting ever, which may be before the period.",
  "series[].noticeHours": "Hours from the series' creation to its first meeting; null when the series master could not be read.",
};

const RULES = [
  "Only the exporting person's own primary calendar was read.",
  "Cancelled meetings and meetings the person declined were dropped (counted in counts.droppedCancelled / droppedDeclined).",
  "Meetings with sensitivity personal, private or confidential were flagged confidential by default; the reviewer could change any flag.",
  "A confidential meeting keeps start, end, duration, all-day and recurrence; its subject reads Confidential and everything else is blank.",
  "Meetings the reviewer unticked are not in the file (counted in counts.untickedByReviewer).",
  "Notice is read from the calendar's created and last-modified times: a one-off counts from its invite, a series from its creation to its first meeting, a moved occurrence from the move; under 24 hours is flagged short notice.",
  "Nothing was stored by the app; this file is the only copy.",
];

const hours = (min: number): number => Math.round((min / 60) * 100) / 100;

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Build the export: masking, ids, counts. */
export function buildExport(input: ExportInput): ExportDoc {
  const included = (m: Meeting): boolean => input.included.has(m.key);
  const isConf = (m: Meeting): boolean => input.confidential.has(m.key);

  // ids in start order: series by their first exported occurrence
  const all = input.groups.flatMap((g) => g.meetings.filter(included).map((m) => ({ m, g })));
  all.sort((a, b) => (a.m.start < b.m.start ? -1 : a.m.start > b.m.start ? 1 : 0));
  const seriesIds = new Map<string, string>();
  for (const { g } of all) if (g.kind === "series" && !seriesIds.has(g.key)) seriesIds.set(g.key, `S${seriesIds.size + 1}`);

  const meetings: ExportMeeting[] = all.map(({ m, g }, i) => {
    const conf = isConf(m);
    const recurrence = g.kind === "series" ? g.recurrence : "";
    const base = {
      meetingId: `M${i + 1}`,
      seriesId: g.kind === "series" ? (seriesIds.get(g.key) ?? null) : null,
      kind: m.kind,
      confidential: conf,
      start: m.start,
      end: m.end,
      date: m.date,
      weekday: m.weekday,
      durationMinutes: m.durationMinutes,
      isAllDay: m.isAllDay,
      recurrence,
      created: m.created,
      lastModified: m.lastModified,
      noticeHours: m.noticeHours,
      shortNotice: m.shortNotice,
    };
    if (conf) {
      return {
        ...base,
        subject: CONFIDENTIAL_SUBJECT,
        showAs: "",
        myResponse: "",
        sensitivity: "",
        location: "",
        onlineProvider: "",
        organizer: null,
        attendeeCount: null,
        internalCount: null,
        externalCount: null,
        attendees: [],
        categories: [],
        importance: "",
        body: "",
      };
    }
    const internal = m.attendees.filter((a) => a.internal && a.role !== "resource").length;
    const people = m.attendees.filter((a) => a.role !== "resource").length;
    return {
      ...base,
      subject: m.subject,
      showAs: m.showAs,
      myResponse: m.myResponse,
      sensitivity: m.sensitivity,
      location: m.location,
      onlineProvider: m.onlineProvider,
      organizer: m.organizer.email || m.organizer.name ? { ...m.organizer } : null,
      attendeeCount: people,
      internalCount: internal,
      externalCount: people - internal,
      attendees: m.attendees.map((a) => ({ ...a })),
      categories: [...m.categories],
      importance: m.importance,
      body: m.body,
    };
  });

  const series: ExportSeries[] = [];
  for (const g of input.groups) {
    if (g.kind !== "series") continue;
    const sid = seriesIds.get(g.key);
    if (!sid) continue; // no occurrence exported
    const occ = g.meetings.filter(included);
    // a series with ANY masked occurrence is masked as a whole
    const conf = occ.some(isConf);
    const durations = occ.map((m) => m.durationMinutes);
    const first = occ.reduce((a, m) => (m.start < a ? m.start : a), occ[0].start);
    const last = occ.reduce((a, m) => (m.start > a ? m.start : a), occ[0].start);
    const distinct = new Set(occ.flatMap((m) => m.attendees.filter((a) => a.role !== "resource").map((a) => a.email || a.name)));
    const org = occ.find((m) => m.organizer.email || m.organizer.name)?.organizer;
    series.push({
      seriesId: sid,
      confidential: conf,
      subject: conf ? CONFIDENTIAL_SUBJECT : g.subject,
      recurrence: g.recurrence,
      occurrencesInPeriod: occ.length,
      hoursInPeriod: hours(durations.reduce((a, b) => a + b, 0)),
      typicalDurationMinutes: median(durations),
      firstInPeriod: first,
      lastInPeriod: last,
      organizer: conf || !org ? null : { ...org },
      distinctAttendees: conf ? null : distinct.size,
      created: g.created,
      firstStart: g.firstStart,
      noticeHours: g.noticeHours,
      shortNotice: g.shortNotice,
    });
  }
  series.sort((a, b) => Number(a.seriesId.slice(1)) - Number(b.seriesId.slice(1)));

  const listed = input.groups.reduce((n, g) => n + g.meetings.length, 0);
  return {
    about: {
      tool: "LeanBoard Utilities · Cadence Current State",
      version: input.appVersion,
      generatedAt: input.generatedAt,
      generatedBy: input.generatedBy,
      period: { from: input.period.from, to: input.period.to, timeZone: input.timeZone },
      internalDomains: [...input.internalDomains],
      source:
        input.road === "graph"
          ? "Outlook calendar via the Office 365 Outlook connector (Microsoft Graph calendarView)"
          : "Outlook calendar via the Office 365 Outlook connector's calendar-view action (attendee responses not available)",
      rules: [...RULES],
      counts: {
        meetingsListed: listed,
        meetingsExported: meetings.length,
        untickedByReviewer: listed - meetings.length,
        droppedCancelled: input.excluded.cancelled,
        droppedDeclined: input.excluded.declined,
        confidential: meetings.filter((m) => m.confidential).length,
        series: series.length,
        oneOffs: meetings.filter((m) => m.seriesId === null).length,
        hoursExported: hours(meetings.reduce((a, m) => a + m.durationMinutes, 0)),
        shortNoticeMeetings: meetings.filter((m) => m.shortNotice).length,
        shortNoticeSeries: series.filter((x) => x.shortNotice).length,
      },
      fields: { ...FIELD_DICTIONARY },
    },
    series,
    meetings,
  };
}

export function exportJson(doc: ExportDoc): string {
  return JSON.stringify(doc, null, 2) + "\n";
}

const cap = (s: string): string => (s.length > EXCEL_TEXT_CAP ? `${s.slice(0, EXCEL_TEXT_CAP)} …(cut at ${EXCEL_TEXT_CAP} characters; the JSON export has it all)` : s);
const dt = (wall: string): CellValue => (wall ? { datetime: wall } : "");

/** The same document as four sheets: About, Series, Meetings, Attendees. */
export function exportSheets(doc: ExportDoc): SheetSpec[] {
  const a = doc.about;
  const aboutRows: CellValue[][] = [
    ["Cadence Current State", ""],
    ["Tool", a.tool],
    ["Version", a.version],
    ["Generated", a.generatedAt],
    ["Generated by", a.generatedBy],
    ["Period from", { date: a.period.from }],
    ["Period to", { date: a.period.to }],
    ["Time zone", a.period.timeZone],
    ["Internal domains", a.internalDomains.join(", ")],
    ["Source", a.source],
    ...Object.entries(a.counts).map(([k, v]): CellValue[] => [k, v]),
    ["", ""],
    ["Rules", ""],
    ...a.rules.map((r): CellValue[] => ["", r]),
    ["", ""],
    ["Field", "Meaning"],
    ...Object.entries(a.fields).map(([k, v]): CellValue[] => [k, v]),
  ];
  const fieldHead = aboutRows.findIndex((r) => r[0] === "Field");
  const rulesHead = aboutRows.findIndex((r) => r[0] === "Rules");

  const seriesRows: CellValue[][] = [
    ["seriesId", "confidential", "subject", "recurrence", "occurrencesInPeriod", "hoursInPeriod", "typicalDurationMinutes", "firstInPeriod", "lastInPeriod", "organizerName", "organizerEmail", "distinctAttendees", "created", "firstStart", "noticeHours", "shortNotice"],
    ...doc.series.map((s): CellValue[] => [
      s.seriesId, s.confidential ? "yes" : "no", s.subject, s.recurrence, s.occurrencesInPeriod, s.hoursInPeriod, s.typicalDurationMinutes,
      dt(s.firstInPeriod), dt(s.lastInPeriod), s.organizer?.name ?? "", s.organizer?.email ?? "", s.distinctAttendees ?? "",
      dt(s.created), dt(s.firstStart), s.noticeHours ?? "", s.shortNotice ? "yes" : "no",
    ]),
  ];

  const meetingRows: CellValue[][] = [
    ["meetingId", "seriesId", "kind", "confidential", "subject", "start", "end", "weekday", "durationMinutes", "isAllDay", "recurrence", "created", "lastModified", "noticeHours", "shortNotice", "showAs", "myResponse", "sensitivity", "location", "onlineProvider", "organizerName", "organizerEmail", "attendeeCount", "internalCount", "externalCount", "categories", "importance", "body"],
    ...doc.meetings.map((m): CellValue[] => [
      m.meetingId, m.seriesId ?? "", m.kind, m.confidential ? "yes" : "no", m.subject, dt(m.start), dt(m.end), m.weekday, m.durationMinutes,
      m.isAllDay ? "yes" : "no", m.recurrence, dt(m.created), dt(m.lastModified), m.noticeHours ?? "", m.shortNotice ? "yes" : "no",
      m.showAs, m.myResponse, m.sensitivity, m.location, m.onlineProvider,
      m.organizer?.name ?? "", m.organizer?.email ?? "", m.attendeeCount ?? "", m.internalCount ?? "", m.externalCount ?? "",
      m.categories.join(", "), m.importance, cap(m.body),
    ]),
  ];

  const attendeeRows: CellValue[][] = [
    ["meetingId", "seriesId", "name", "email", "role", "response", "internal"],
    ...doc.meetings.flatMap((m) =>
      m.attendees.map((p): CellValue[] => [m.meetingId, m.seriesId ?? "", p.name, p.email, p.role, p.response, p.internal ? "yes" : "no"])
    ),
  ];

  return [
    { name: "About", rows: aboutRows, colWidths: [24, 110], boldRows: [0, rulesHead, fieldHead] },
    { name: "Series", rows: seriesRows, boldRows: [0], freezeRows: 1, colWidths: [9, 12, 40, 40, 12, 12, 12, 17, 17, 24, 30, 12, 17, 17, 11, 11] },
    { name: "Meetings", rows: meetingRows, boldRows: [0], freezeRows: 1, colWidths: [10, 9, 10, 12, 40, 17, 17, 11, 10, 9, 36, 17, 17, 11, 11, 10, 14, 12, 28, 16, 24, 30, 10, 10, 10, 16, 10, 80] },
    { name: "Attendees", rows: attendeeRows, boldRows: [0], freezeRows: 1, colWidths: [10, 9, 28, 34, 11, 18, 9] },
  ];
}
