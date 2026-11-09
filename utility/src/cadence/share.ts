// Cadence Current State — sending the reviewed result (Ben, 2026-11-05).
// Pure: the email summary built from the EXPORT document (so it is masked
// exactly as the files are), and the task link — a player URL whose launch
// parameters open the app straight into Cadence, scan a period relative
// to the day it is opened, and offer "Send to <person>" on the review.
// Sending stays an explicit press after the review: the link never sends
// anything by itself.

import type { ExportDoc } from "./exportDoc";
import { addMonths, isInternal, periodProblem } from "./model";

/** Launch parameters (the player lower-cases nothing, so they are read
 *  case-blind). */
export const TASK_PARAMS = { tool: "utool", months: "umonths", from: "ufrom", to: "uto", sendTo: "usendto", note: "unote" } as const;
export const TASK_TOOL = "cadence";
export const NOTE_MAX = 300;
/** Rows of the series table in the email body (the files carry everything). */
export const SUMMARY_SERIES_ROWS = 15;

export interface CadenceTask {
  /** Relative period: -3 = the last 3 months to today; 2 = today to 2 months on. */
  months: number;
  /** Fixed dates (yyyy-mm-dd) instead of the relative period, when both are set. */
  from?: string;
  to?: string;
  sendTo: string;
  note: string;
}

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;

export function isEmail(s: string): boolean {
  return EMAIL.test(s.trim());
}

/** Why this address cannot receive the result, or null. */
export function recipientProblem(email: string, internalDomains: string[], viewerEmail = ""): string | null {
  const e = email.trim().toLowerCase();
  if (e === "") return "Enter the person's email address.";
  if (!isEmail(e)) return "That is not an email address.";
  if (internalDomains.length > 0 && !isInternal(e, internalDomains)) return `Only people in ${internalDomains.join(", ")} can receive the result.`;
  if (viewerEmail !== "" && e === viewerEmail.trim().toLowerCase()) return "That is you — export the files instead.";
  return null;
}

export function taskProblem(t: CadenceTask, internalDomains: string[]): string | null {
  if (isFixed(t)) {
    const p = periodProblem(t.from!, t.to!);
    if (p) return p;
  } else if (!Number.isInteger(t.months) || t.months === 0 || Math.abs(t.months) > 12) return "The period must be 1 to 12 months.";
  if (t.note.length > NOTE_MAX) return `The note is longer than ${NOTE_MAX} characters.`;
  return recipientProblem(t.sendTo, internalDomains);
}

export function isFixed(t: CadenceTask): boolean {
  return (t.from ?? "") !== "" && (t.to ?? "") !== "";
}

/** The period a task scans: its fixed dates, or the relative months
 *  counted from `today` (the day the link is opened). */
export function taskPeriod(t: CadenceTask, today: string): { from: string; to: string } {
  if (isFixed(t)) return { from: t.from!, to: t.to! };
  return t.months < 0 ? { from: addMonths(today, t.months), to: today } : { from: today, to: addMonths(today, t.months) };
}

/** "the last 3 months" / "2026-10-01 to 2026-10-31". */
export function taskPeriodText(t: CadenceTask): string {
  return isFixed(t) ? `${t.from} to ${t.to}` : relativePeriodText(t.months);
}

/** The launch parameters for a task. */
export function taskQuery(t: CadenceTask): Record<string, string> {
  const q: Record<string, string> = { [TASK_PARAMS.tool]: TASK_TOOL };
  if (isFixed(t)) {
    q[TASK_PARAMS.from] = t.from!;
    q[TASK_PARAMS.to] = t.to!;
  } else q[TASK_PARAMS.months] = String(t.months);
  q[TASK_PARAMS.sendTo] = t.sendTo.trim().toLowerCase();
  if (t.note.trim() !== "") q[TASK_PARAMS.note] = t.note.trim();
  return q;
}

export interface PlayerHost {
  appId: string;
  environmentId: string;
  tenantId: string;
}

const PLAYER = "https://apps.powerapps.com/play";

/** The link to hand out. Without a host (the dev server) the page's own
 *  URL with the same query is the only honest link. */
export function taskLink(t: CadenceTask, host: PlayerHost | null, pageUrl = ""): string {
  const q = new URLSearchParams();
  if (host && host.tenantId !== "") q.set("tenantId", host.tenantId);
  for (const [k, v] of Object.entries(taskQuery(t))) q.set(k, v);
  if (!host || host.appId === "" || host.environmentId === "") return `${pageUrl.split(/[?#]/)[0]}?${q.toString()}`;
  return `${PLAYER}/e/${host.environmentId}/app/${host.appId}?${q.toString()}`;
}

/** Read a task from the host's launch parameters and the page's own
 *  query (mobile hands them in the URL). Null when this boot is not a
 *  task, or the task does not hold together. */
export function parseTask(hostParams: Record<string, string>, search: string): CadenceTask | null {
  const query = new URLSearchParams(search);
  const param = (name: string): string => {
    const named = Object.entries(hostParams).find(([k]) => k.toLowerCase() === name);
    let v = (named?.[1] ?? "").trim();
    if (v === "") for (const [k, qv] of query) if (k.toLowerCase() === name) v = qv.trim();
    return v;
  };
  if (param(TASK_PARAMS.tool).toLowerCase() !== TASK_TOOL) return null;
  const months = Number(param(TASK_PARAMS.months) || "-1");
  const t: CadenceTask = { months, sendTo: param(TASK_PARAMS.sendTo).toLowerCase(), note: param(TASK_PARAMS.note).slice(0, NOTE_MAX) };
  const from = param(TASK_PARAMS.from);
  const to = param(TASK_PARAMS.to);
  if (from !== "" || to !== "") {
    t.from = from;
    t.to = to;
    if (!isFixed(t)) return null; // one date without the other does not hold together
  }
  return taskProblem(t, []) === null ? t : null;
}

/** "the last 3 months" / "the next month". */
export function relativePeriodText(months: number): string {
  const n = Math.abs(months);
  const span = n === 1 ? "month" : `${n} months`;
  return months < 0 ? `the last ${span}` : `the next ${span}`;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (k: number, one: string, many = `${one}s`): string => `${k} ${k === 1 ? one : many}`;
const fmtH = (h: number): string => (h >= 10 ? String(Math.round(h)) : String(Math.round(h * 10) / 10));

export interface SummaryFigures {
  meetings: number;
  series: number;
  oneOffs: number;
  hours: number;
  hoursAWeek: number;
  confidential: number;
  untickedByReviewer: number;
  dropped: number;
  /** Exported meetings and series flagged short notice (under 24 h). */
  shortNotice: number;
}

export function summaryFigures(doc: ExportDoc): SummaryFigures {
  const c = doc.about.counts;
  const [y1, m1, d1] = doc.about.period.from.split("-").map(Number);
  const [y2, m2, d2] = doc.about.period.to.split("-").map(Number);
  const days = Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1;
  const weeks = Math.max(1, days / 7);
  return {
    meetings: c.meetingsExported,
    series: c.series,
    oneOffs: c.oneOffs,
    hours: c.hoursExported,
    hoursAWeek: Math.round((c.hoursExported / weeks) * 10) / 10,
    confidential: c.confidential,
    untickedByReviewer: c.untickedByReviewer,
    dropped: c.droppedCancelled + c.droppedDeclined,
    shortNotice: (c.shortNoticeMeetings ?? 0) + (c.shortNoticeSeries ?? 0),
  };
}

/** base64 for an email attachment (chunked: a 12-month JSON is MBs). */
export function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export function resultSubject(doc: ExportDoc): string {
  const a = doc.about;
  return `Cadence Current State: ${a.period.from} to ${a.period.to}${a.generatedBy ? ` (${a.generatedBy})` : ""}`;
}

export const EMAIL_FILE_LINE = "The JSON and Excel files are attached.";

/** The email body: who, the period, the figures, the top series by
 *  hours. Built from the export so masking is the file's own. */
export function summaryHtml(doc: ExportDoc, opts: { note?: string; fileLine?: string } = {}): string {
  const f = summaryFigures(doc);
  const a = doc.about;
  const out: string[] = [];
  out.push(`<p><b>Cadence Current State</b> from ${esc(a.generatedBy || "a colleague")}</p>`);
  out.push(`<p>${esc(a.period.from)} to ${esc(a.period.to)} (${esc(a.period.timeZone)})</p>`);
  if (opts.note && opts.note.trim() !== "") out.push(`<p><i>${esc(opts.note.trim())}</i></p>`);
  out.push(
    `<p>${n(f.meetings, "meeting")} exported: ${n(f.series, "recurring series", "recurring series")} and ${n(f.oneOffs, "one-off")}, ` +
      `${fmtH(f.hours)} h in all, about ${fmtH(f.hoursAWeek)} h a week. ` +
      `${f.confidential} confidential (timing only). ` +
      `${f.shortNotice} on short notice (under 24 h). ` +
      `${f.untickedByReviewer} left out in review, ${f.dropped} cancelled or declined.</p>`
  );
  const top = [...doc.series].sort((x, y) => y.hoursInPeriod - x.hoursInPeriod).slice(0, SUMMARY_SERIES_ROWS);
  if (top.length > 0) {
    out.push(`<p><b>Recurring series by hours</b>${doc.series.length > top.length ? ` (top ${top.length} of ${doc.series.length})` : ""}</p>`);
    out.push("<table><tr><th>Series</th><th>Pattern</th><th>Times</th><th>Hours</th></tr>");
    for (const s of top) {
      out.push(`<tr><td>${esc(s.subject || "(no subject)")}</td><td>${esc(s.recurrence)}</td><td>${s.occurrencesInPeriod}</td><td>${fmtH(s.hoursInPeriod)}</td></tr>`);
    }
    out.push("</table>");
  }
  if (opts.fileLine) out.push(`<p>${opts.fileLine}</p>`);
  return out.join("");
}
