// Calendar probe (Cadence Current State, Phase 0) — measures the calendar
// roads through the connector door before the tool is built
// (docs/cadence-current-state-plan-2026-11.md). Questions it answers:
//
//   1. Does the Outlook connector's HttpRequest (Graph passthrough) serve
//      /me/calendar/calendarView, and is /me/calendarView refused (the
//      action documents only events/calendar/calendars as 2nd segments)?
//   2. Are the Prefer headers honoured (outlook.timezone, body as text)?
//   3. Which fields come back: attendee type + response, event type,
//      series id, sensitivity, cancelled, online meeting, body.
//   4. Does @odata.nextLink paging work through the passthrough?
//   5. Does a series master read give the recurrence pattern?
//   6. The fallback: what the typed V3 calendar-view action returns.
//   7. Office 365 Users: job title / department for an internal attendee.
//
// Output is STATUS ONLY — counts, field names, enum values, status codes
// and timings. Never subjects, bodies, names, addresses or ids, so the log
// can be pasted into a chat (the notifyProbe rule in LeanBoard).

import { getContext } from "@microsoft/power-apps/app";
import { Office365OutlookService } from "./generated/services/Office365OutlookService";
import { Office365UsersService } from "./generated/services/Office365UsersService";

type Log = (line: string) => void;

interface OpResult {
  success?: boolean;
  data?: unknown;
  error?: unknown;
}

const GRAPH = "https://graph.microsoft.com/v1.0";

const SELECT = [
  "id", "subject", "start", "end", "isAllDay", "type", "seriesMasterId", "iCalUId",
  "sensitivity", "showAs", "isCancelled", "responseStatus", "organizer", "attendees",
  "location", "locations", "isOnlineMeeting", "onlineMeetingProvider", "body",
  "categories", "importance", "webLink",
].join(",");

function why(r: OpResult): string {
  const e = r.error as { message?: unknown; code?: unknown } | string | null | undefined;
  const msg = typeof e === "string" ? e : typeof e?.message === "string" ? e.message : JSON.stringify(e ?? "refused");
  return msg.slice(0, 300);
}

/** The passthrough's body: an object, or JSON text on some hosts. */
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

interface GraphCall {
  ok: boolean;
  why: string;
  body: Record<string, unknown> | null;
  ms: number;
}

async function graphGet(uri: string, headers: string[] = []): Promise<GraphCall> {
  const t0 = performance.now();
  try {
    const r = (await Office365OutlookService.HttpRequest(
      uri,
      "GET",
      undefined,
      undefined,
      headers[0],
      headers[1],
      headers[2]
    )) as OpResult;
    const ms = Math.round(performance.now() - t0);
    if (r?.success === false) return { ok: false, why: why(r), body: null, ms };
    return { ok: true, why: "", body: bodyOf(r?.data), ms };
  } catch (e) {
    return { ok: false, why: `threw: ${String(e).slice(0, 300)}`, body: null, ms: Math.round(performance.now() - t0) };
  }
}

type Ev = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const set = (xs: Iterable<string>): string => [...new Set([...xs].filter((x) => x !== ""))].sort().join(", ") || "(none)";

function describeEvents(log: Log, events: Ev[], viewerDomain: string): string[] {
  const attendees = events.flatMap((e) => arr(e.attendees).map(obj));
  const addresses = attendees.map((a) => str(obj(a.emailAddress).address).toLowerCase());
  const internal = addresses.filter((a) => viewerDomain !== "" && a.endsWith(`@${viewerDomain}`));
  const bodies = events.map((e) => obj(e.body));
  const maxBody = Math.max(0, ...bodies.map((b) => str(b.content).length));
  log(`  events: ${events.length}`);
  log(`  event types: ${set(events.map((e) => str(e.type)))}`);
  log(`  with seriesMasterId: ${events.filter((e) => str(e.seriesMasterId) !== "").length}`);
  log(`  sensitivity values: ${set(events.map((e) => str(e.sensitivity)))}`);
  log(`  showAs values: ${set(events.map((e) => str(e.showAs)))}`);
  log(`  my response values: ${set(events.map((e) => str(obj(e.responseStatus).response)))}`);
  log(`  cancelled: ${events.filter((e) => e.isCancelled === true).length} · all-day: ${events.filter((e) => e.isAllDay === true).length}`);
  log(`  online meeting providers: ${set(events.map((e) => str(e.onlineMeetingProvider)))}`);
  log(`  with organizer address: ${events.filter((e) => str(obj(obj(e.organizer).emailAddress).address) !== "").length}`);
  log(`  with a location name: ${events.filter((e) => str(obj(e.location).displayName) !== "").length}`);
  log(`  start.timeZone values: ${set(events.map((e) => str(obj(e.start).timeZone)))}`);
  log(`  body contentType values: ${set(bodies.map((b) => str(b.contentType)))} · longest body ${maxBody} chars`);
  log(`  attendee rows: ${attendees.length} · types: ${set(attendees.map((a) => str(a.type)))}`);
  log(`  attendee response values: ${set(attendees.map((a) => str(obj(a.status).response)))}`);
  log(`  attendees in my domain: ${internal.length} · others: ${attendees.length - internal.length}`);
  const sample = events[0];
  if (sample) log(`  fields on the first event: ${Object.keys(sample).filter((k) => !k.startsWith("@")).sort().join(", ")}`);
  return [...new Set(internal)];
}

function isoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export async function runCalendarProbe(log: Log): Promise<void> {
  // ---- 0. who and where -------------------------------------------------
  let viewerDomain = "";
  try {
    const ctx = await Promise.race([
      getContext(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2500)),
    ]);
    const upn = ctx.user?.userPrincipalName ?? "";
    viewerDomain = upn.includes("@") ? upn.split("@")[1].toLowerCase() : "";
    log(`Hosted: yes · signed in: ${upn ? "yes" : "no"} · domain known: ${viewerDomain ? "yes" : "no"}`);
  } catch {
    log("FAIL — no host context. Run this inside the Power Apps player, not on a dev server.");
    return;
  }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  log(`Browser time zone: ${tz}`);

  const end = new Date();
  const start = new Date(end.getTime() - 7 * 86400000);
  const range = `startDateTime=${isoNoMs(start)}&endDateTime=${isoNoMs(end)}`;
  const tzHeader = `Prefer: outlook.timezone="${tz}"`;
  const textHeader = `Prefer: outlook.body-content-type="text"`;

  // ---- 1. calendarView through the passthrough ---------------------------
  log("");
  log("— 1. Graph calendarView, last 7 days (Outlook connector HttpRequest) —");
  const viewPath = `/me/calendar/calendarView?${range}&$top=200&$select=${SELECT}`;
  let view = await graphGet(`${GRAPH}${viewPath}`, [tzHeader, textHeader]);
  log(`  absolute URI, two Prefer headers: ${view.ok ? "OK" : "FAIL"} (${view.ms} ms)${view.ok ? "" : ` — ${view.why}`}`);
  if (!view.ok) {
    view = await graphGet(`/v1.0${viewPath}`, [tzHeader, textHeader]);
    log(`  relative URI, two Prefer headers: ${view.ok ? "OK" : "FAIL"} (${view.ms} ms)${view.ok ? "" : ` — ${view.why}`}`);
  }
  let internal: string[] = [];
  if (view.ok) {
    const events = arr(view.body?.value).map(obj);
    log(`  @odata.nextLink present: ${typeof view.body?.["@odata.nextLink"] === "string" ? "yes" : "no"}`);
    internal = describeEvents(log, events, viewerDomain);
    const zones = new Set(events.map((e) => str(obj(e.start).timeZone)));
    const textBodies = events.every((e) => str(obj(e.body).contentType).toLowerCase() !== "html");
    log(`  time zone header honoured: ${events.length === 0 ? "n/a (no events)" : zones.has(tz) && zones.size === 1 ? "yes" : "no"}`);
    log(`  text body header honoured: ${events.length === 0 ? "n/a (no events)" : textBodies ? "yes" : "no"}`);
    if (events.length > 0 && (!zones.has(tz) || !textBodies)) {
      const both = await graphGet(`${GRAPH}${viewPath}`, [`Prefer: outlook.timezone="${tz}", outlook.body-content-type="text"`]);
      const ev2 = arr(both.body?.value).map(obj);
      log(`  retry with ONE combined Prefer header: ${both.ok ? "OK" : `FAIL — ${both.why}`}`);
      if (both.ok) {
        log(`    start.timeZone values: ${set(ev2.map((e) => str(obj(e.start).timeZone)))}`);
        log(`    body contentType values: ${set(ev2.map((e) => str(obj(e.body).contentType)))}`);
      }
    }
  }

  // the documented segment list omits calendarView: is /me/calendarView refused?
  const flat = await graphGet(`${GRAPH}/me/calendarView?${range}&$top=1&$select=id`);
  log(`  /me/calendarView (undocumented 2nd segment): ${flat.ok ? "OK" : `refused — ${flat.why}`}`);

  // ---- 2. paging ---------------------------------------------------------
  log("");
  log("— 2. Paging through @odata.nextLink —");
  const small = await graphGet(`${GRAPH}/me/calendar/calendarView?${range}&$top=3&$select=id`, [tzHeader]);
  const next = small.ok ? small.body?.["@odata.nextLink"] : undefined;
  if (!small.ok) log(`  first page FAIL — ${small.why}`);
  else if (typeof next !== "string") log(`  first page ${arr(small.body?.value).length} events, no nextLink (fewer than 4 events this week — not measurable)`);
  else {
    const page2 = await graphGet(next, [tzHeader]);
    log(`  first page ${arr(small.body?.value).length} events · nextLink followed: ${page2.ok ? `OK, ${arr(page2.body?.value).length} events (${page2.ms} ms)` : `FAIL — ${page2.why}`}`);
    if (!page2.ok) {
      const rel = next.replace(/^https:\/\/graph\.microsoft\.com/, "");
      const page2r = await graphGet(rel, [tzHeader]);
      log(`  nextLink as a relative URI: ${page2r.ok ? `OK, ${arr(page2r.body?.value).length} events` : `FAIL — ${page2r.why}`}`);
    }
  }

  // ---- 3. a series master --------------------------------------------------
  log("");
  log("— 3. Series master (recurrence pattern) —");
  const firstSeries = view.ok
    ? arr(view.body?.value).map(obj).map((e) => str(e.seriesMasterId)).find((id) => id !== "")
    : undefined;
  if (!firstSeries) log("  no recurring occurrence in the last 7 days — not measurable");
  else {
    const m = await graphGet(`${GRAPH}/me/events/${encodeURIComponent(firstSeries)}?$select=type,recurrence`, [tzHeader]);
    if (!m.ok) log(`  FAIL — ${m.why}`);
    else {
      const rec = obj(m.body?.recurrence);
      const pat = obj(rec.pattern);
      const rng = obj(rec.range);
      log(`  OK (${m.ms} ms) · type ${str(m.body?.type) || "(none)"}`);
      log(`  pattern type: ${str(pat.type) || "(none)"} · interval: ${typeof pat.interval === "number" ? pat.interval : "(none)"} · daysOfWeek: ${arr(pat.daysOfWeek).length ? "yes" : "no"}`);
      log(`  range type: ${str(rng.type) || "(none)"} · has start date: ${str(rng.startDate) ? "yes" : "no"}`);
    }
  }

  // ---- 4. the typed V3 action (fallback road) -----------------------------
  log("");
  log("— 4. Typed calendar-view action V3 (fallback if DLP blocks HttpRequest) —");
  try {
    const t = (await Office365OutlookService.CalendarGetTables()) as OpResult;
    if (t?.success === false) log(`  CalendarGetTables FAIL — ${why(t)}`);
    else {
      const tables = arr(obj(t?.data).value).map(obj);
      log(`  calendars visible: ${tables.length}`);
      const cal = tables.find((x) => str(x.DisplayName) === "Calendar") ?? tables[0];
      if (cal) {
        const t0 = performance.now();
        const v = (await Office365OutlookService.GetEventsCalendarViewV3(str(cal.Name), start.toISOString(), end.toISOString())) as OpResult;
        const ms = Math.round(performance.now() - t0);
        if (v?.success === false) log(`  GetEventsCalendarViewV3 FAIL — ${why(v)}`);
        else {
          const items = arr(obj(v?.data).value).map(obj);
          log(`  GetEventsCalendarViewV3 OK (${ms} ms) · events: ${items.length} (calendar chosen by name "Calendar": ${str(cal.DisplayName) === "Calendar" ? "yes" : "no, first listed"})`);
          if (items[0]) log(`  fields: ${Object.keys(items[0]).sort().join(", ")}`);
        }
      }
    }
  } catch (e) {
    log(`  threw: ${String(e).slice(0, 300)}`);
  }

  // ---- 5. people lookup ----------------------------------------------------
  log("");
  log("— 5. Office 365 Users: job title and department —");
  if (internal.length === 0) log("  no internal attendee in the last 7 days — not measurable");
  else {
    let found = 0;
    let title = 0;
    let dept = 0;
    const tried = internal.slice(0, 3);
    const t0 = performance.now();
    for (const a of tried) {
      try {
        const r = (await Office365UsersService.UserProfile_V2(a, "jobTitle,department")) as OpResult;
        if (r?.success === false) continue;
        found++;
        const d = obj(r?.data);
        if (str(d.jobTitle)) title++;
        if (str(d.department)) dept++;
      } catch {
        /* counted as not found */
      }
    }
    log(`  looked up ${tried.length} · found ${found} · with job title ${title} · with department ${dept} (${Math.round(performance.now() - t0)} ms)`);
  }

  // ---- 6. size estimate ------------------------------------------------------
  if (view.ok) {
    const n = arr(view.body?.value).length;
    log("");
    log(`— 6. Estimate — ${n} events a week ≈ ${n * 52} occurrences over 12 months (${Math.ceil((n * 52) / 200)} pages of 200).`);
  }
}
