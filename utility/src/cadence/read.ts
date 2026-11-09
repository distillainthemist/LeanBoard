// Cadence Current State — the calendar scan (connector door only).
// Road measured by the Phase 0 probe (docs/cadence-current-state-plan-2026-11.md):
//  · the Outlook connector's HttpRequest on /me/calendar/calendarView —
//    /me/calendarView is refused by the connector;
//  · ONE combined Prefer header, or the time zone is ignored;
//  · series masters by /me/events/{id} for the recurrence pattern, the
//    created time and the first start (the series' notice);
//  · the typed GetEventsCalendarViewV3 action when the passthrough is
//    refused (a DLP policy can block HTTP actions) — less detail.
// Nothing is stored: the result lives in the screen until it is left.

import { Office365OutlookService } from "../generated/services/Office365OutlookService";
import type { GraphCalendarEventClientReceive } from "../generated/models/Office365OutlookModel";
import { toWall, type GraphEvent, type GraphSeriesMaster } from "./model";

const GRAPH = "https://graph.microsoft.com/v1.0";
const PAGE = 100;
const MAX_PAGES = 400; // 40,000 events — far past a year of anyone's calendar
const IN_FLIGHT = 4;

const SELECT = [
  "id", "subject", "start", "end", "isAllDay", "type", "seriesMasterId", "sensitivity", "showAs", "isCancelled",
  "responseStatus", "organizer", "attendees", "location", "isOnlineMeeting", "onlineMeetingProvider", "body",
  "categories", "importance", "webLink", "createdDateTime", "lastModifiedDateTime",
].join(",");

export class ScanCancelled extends Error {
  constructor() {
    super("cancelled");
  }
}

export interface ScanOptions {
  /** Local midnight of the first day and of the day AFTER the last. */
  start: Date;
  end: Date;
  timeZone: string;
  internalDomains: string[];
  progress: (text: string) => void;
  cancelled: () => boolean;
}

export interface ScanResult {
  events: GraphEvent[];
  masters: Map<string, GraphSeriesMaster>;
  road: "graph" | "typed";
  warnings: string[];
}

interface OpResult {
  success?: boolean;
  data?: unknown;
  error?: unknown;
}

function why(r: OpResult): string {
  const e = r.error as { message?: unknown } | string | null | undefined;
  const msg = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : JSON.stringify(e ?? "refused");
  return msg.slice(0, 300);
}

function bodyOf(data: unknown): Record<string, unknown> | null {
  if (data && typeof data === "object") return data as Record<string, unknown>;
  if (typeof data === "string") {
    try {
      const v = JSON.parse(data);
      return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

async function graphGet(uri: string, prefer: string): Promise<Record<string, unknown>> {
  const r = (await Office365OutlookService.HttpRequest(uri, "GET", undefined, undefined, prefer)) as OpResult;
  if (r?.success === false) throw new Error(why(r));
  const b = bodyOf(r?.data);
  if (!b) throw new Error("the connector returned no readable body");
  return b;
}

const isoNoMs = (d: Date): string => d.toISOString().replace(/\.\d{3}Z$/, "Z");

async function pool<T>(items: T[], n: number, work: (item: T) => Promise<void>, cancelled: () => boolean): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      if (cancelled()) throw new ScanCancelled();
      const item = items[next++];
      await work(item);
    }
  });
  await Promise.all(runners);
}

async function readGraph(o: ScanOptions, prefer: string): Promise<GraphEvent[]> {
  const events: GraphEvent[] = [];
  let uri: string | null =
    `${GRAPH}/me/calendar/calendarView?startDateTime=${isoNoMs(o.start)}&endDateTime=${isoNoMs(o.end)}` +
    `&$top=${PAGE}&$select=${SELECT}`;
  for (let page = 0; uri && page < MAX_PAGES; page++) {
    if (o.cancelled()) throw new ScanCancelled();
    let body: Record<string, unknown>;
    try {
      body = await graphGet(uri, prefer);
    } catch (e) {
      // a nextLink the connector will not take whole: try it relative once
      if (page > 0 && uri.startsWith(GRAPH)) body = await graphGet(uri.slice("https://graph.microsoft.com".length), prefer);
      else throw e;
    }
    const value = Array.isArray(body.value) ? (body.value as GraphEvent[]) : [];
    events.push(...value);
    o.progress(`Reading your calendar… ${events.length} meeting${events.length === 1 ? "" : "s"} so far`);
    const next = body["@odata.nextLink"];
    uri = typeof next === "string" && next !== "" ? next : null;
  }
  return events;
}

/** The typed action's event in the Graph shape the model reads. */
function fromTyped(e: GraphCalendarEventClientReceive, timeZone: string): GraphEvent {
  const wall = (iso: string | undefined): string => {
    const w = toWall(iso, timeZone);
    return w === "" ? "" : `${w}:00`;
  };
  const split = (s: string | undefined, type: string) =>
    (s ?? "")
      .split(";")
      .map((x) => x.trim())
      .filter((x) => x !== "")
      .map((address) => ({ type, status: { response: "" }, emailAddress: { name: "", address } }));
  return {
    id: e.id,
    subject: e.subject,
    start: { dateTime: wall(e.startWithTimeZone ?? e.start), timeZone },
    end: { dateTime: wall(e.endWithTimeZone ?? e.end), timeZone },
    isAllDay: e.isAllDay,
    type: e.seriesMasterId ? "occurrence" : "singleInstance",
    seriesMasterId: e.seriesMasterId ?? null,
    sensitivity: e.sensitivity,
    showAs: e.showAs,
    responseStatus: { response: e.responseType },
    organizer: { emailAddress: { name: "", address: e.organizer } },
    attendees: [...split(e.requiredAttendees, "required"), ...split(e.optionalAttendees, "optional"), ...split(e.resourceAttendees, "resource")],
    location: { displayName: e.location },
    body: { contentType: e.isHtml ? "html" : "text", content: e.body },
    categories: e.categories,
    importance: e.importance,
    webLink: e.webLink,
    createdDateTime: e.createdDateTime,
    lastModifiedDateTime: e.lastModifiedDateTime,
  };
}

async function readTyped(o: ScanOptions): Promise<GraphEvent[]> {
  const t = (await Office365OutlookService.CalendarGetTables()) as OpResult;
  if (t?.success === false) throw new Error(why(t));
  const tables = ((t?.data as { value?: { Name?: string; DisplayName?: string }[] })?.value ?? []);
  const cal = tables.find((x) => x.DisplayName === "Calendar") ?? tables[0];
  if (!cal?.Name) throw new Error("no calendar found");
  const out: GraphEvent[] = [];
  const top = 256;
  for (let skip = 0; skip < PAGE * MAX_PAGES; skip += top) {
    if (o.cancelled()) throw new ScanCancelled();
    const r = (await Office365OutlookService.GetEventsCalendarViewV3(cal.Name, o.start.toISOString(), o.end.toISOString(), undefined, undefined, top, skip)) as OpResult;
    if (r?.success === false) throw new Error(why(r));
    const items = ((r?.data as { value?: GraphCalendarEventClientReceive[] })?.value ?? []);
    out.push(...items.map((e) => fromTyped(e, o.timeZone)));
    o.progress(`Reading your calendar… ${out.length} meetings so far`);
    if (items.length < top) break;
  }
  return out;
}

export async function scanCalendar(o: ScanOptions): Promise<ScanResult> {
  const warnings: string[] = [];
  const prefer = `Prefer: outlook.timezone="${o.timeZone}", outlook.body-content-type="text"`;
  o.progress("Reading your calendar…");

  let events: GraphEvent[];
  let road: "graph" | "typed" = "graph";
  try {
    events = await readGraph(o, prefer);
  } catch (e) {
    if (e instanceof ScanCancelled) throw e;
    warnings.push(`The detailed calendar read was refused (${String((e as Error).message ?? e).slice(0, 160)}); the simpler calendar action was used, so attendee responses and recurrence patterns are missing.`);
    road = "typed";
    events = await readTyped(o);
  }

  // series masters → recurrence pattern, created time and first start
  const masters = new Map<string, GraphSeriesMaster>();
  if (road === "graph") {
    const ids = [...new Set(events.map((e) => e.seriesMasterId ?? "").filter((id) => id !== ""))];
    let done = 0;
    let failed = 0;
    await pool(
      ids,
      IN_FLIGHT,
      async (id) => {
        try {
          const b = await graphGet(`${GRAPH}/me/events/${encodeURIComponent(id)}?$select=recurrence,createdDateTime,start`, prefer);
          const master: GraphSeriesMaster = {};
          if (b.recurrence && typeof b.recurrence === "object") master.recurrence = b.recurrence as GraphSeriesMaster["recurrence"];
          if (typeof b.createdDateTime === "string") master.createdDateTime = b.createdDateTime;
          if (b.start && typeof b.start === "object") master.start = b.start as GraphSeriesMaster["start"];
          if (Object.keys(master).length > 0) masters.set(id, master);
        } catch {
          failed++;
        }
        o.progress(`Reading recurring series… ${++done} of ${ids.length}`);
      },
      o.cancelled
    );
    if (failed > 0) warnings.push(`${failed} recurring series could not be read; they show as "Recurring" without a pattern or notice.`);
  }

  return { events, masters, road, warnings };
}
